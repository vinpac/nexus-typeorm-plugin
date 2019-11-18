import { SchemaBuilder } from '../schema-builder'
import * as Nexus from 'nexus'
import { EntityMetadata, getConnection } from 'typeorm'
import { columnToGraphQLTypeDef } from '../type'
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata'
import { OutputPropertyFactoryConfig } from 'nexus/dist/dynamicProperty'
import { RelationMetadata } from 'typeorm/metadata/RelationMetadata'
import { GraphQLResolveInfo, GraphQLFieldResolver } from 'graphql'
import { fieldNamingStrategy, FindManyResolveFn } from './crud-output-method'
import { getEntityTypeName, getEntityPrimaryColumn } from '../util'
import { propertyPathToAlias } from '../query-builder'

declare global {
  export interface NexusGenCustomOutputMethods<TypeName extends string> {
    entityField: EntityOutputMethod<string>
  }
}

interface EntityOutputMethodResolveFnContext<
  TType,
  TSource = any,
  TArgs = { [argName: string]: any },
  TContext = any
> {
  source: any
  args: { [argName: string]: any }
  ctx?: any
  info: GraphQLResolveInfo
  next: (
    ctx: Omit<EntityOutputMethodResolveFnContext<TType, TSource, TArgs, TContext>, 'next'>,
  ) => Promise<TType>
}

interface EntityOutputMethodResolveFn<TType> {
  (ctx: EntityOutputMethodResolveFnContext<TType>): Promise<TType>
}

export interface EntityOutputMethod<TFieldName extends string> {
  (fieldName: TFieldName, config?: EntityOutputMethodConfig<any>): void
}

interface BaseEntityOutputMethodConfig {
  alias?: string
  type?: Nexus.core.AllOutputTypes
  filtering?: boolean
  ordering?: boolean
}
interface UniqueEntityOutputMethodConfig<TType> extends BaseEntityOutputMethodConfig {
  resolve?: EntityOutputMethodResolveFn<TType>
  pagination?: true
}

interface PaginationEntityOutputMethodConfig<TType> extends BaseEntityOutputMethodConfig {
  resolve?: EntityOutputMethodResolveFn<TType[]>
  pagination?: false
}

export type EntityOutputMethodConfig<TType> =
  | UniqueEntityOutputMethodConfig<TType>
  | PaginationEntityOutputMethodConfig<TType>

function buildRelationFieldPublisher(entity: Function, schemaBuilder: SchemaBuilder) {
  return (
    { typeDef: t }: OutputPropertyFactoryConfig<any>,
    relation: RelationMetadata,
    config?: EntityOutputMethodConfig<any>,
  ) => {
    const fieldName = config && config.alias ? config.alias : relation.propertyName
    const entityMetadata = schemaBuilder.entitiesMetadata[entity.name]
    const relatedEntity = schemaBuilder.entities[relation.inverseEntityMetadata.name]
    const relatedEntityTypeName = getEntityTypeName(relatedEntity)
    const entityPrimaryKey = getEntityPrimaryColumn(entity).propertyName
    const relatedEntityPrimaryKey = getEntityPrimaryColumn(entity).propertyName

    if (!relatedEntity) {
      throw new Error(
        `Unable to find related entity '${t.typeName}' of property '${relation.propertyName}' on '${entityMetadata.name}' `,
      )
    }

    if (relation.isOneToMany || relation.isManyToMany) {
      if (!relation.inverseRelation) {
        throw new Error(
          `Unable to access inverseRelation on \`${entityMetadata.name}.${
            relation.propertyName
          }\`.\nDefine the inverse side function for @${
            relation.isOneToMany ? 'OneToMany' : 'ManyToMany'
          }(_, <HERE>) on both \`${entityMetadata.name}\` and \`${
            relation.inverseEntityMetadata.name
          }\``,
        )
      }

      const resolve: FindManyResolveFn<any> = ctx => {
        if (!ctx.args.where && ctx.source[relation.propertyName]) {
          return ctx.source[relation.propertyName]
        }

        if (relation.isManyToMany) {
          const relationPropertyPath = relation.inverseRelation!.propertyPath
          return ctx.next({
            ...ctx,
            queryBuilderConfig: config => ({
              ...config,
              joins: [
                ...(config.joins || []),
                {
                  type: 'inner',
                  propertyPath: relationPropertyPath,
                  where: {
                    expression: `${propertyPathToAlias(
                      relationPropertyPath,
                    )}.${relatedEntityPrimaryKey} = :pk`,
                    params: { pk: ctx.source[entityPrimaryKey] },
                  },
                },
              ],
            }),
          })
        }

        const inverseForeignKeyName = relation.inverseRelation!.foreignKeys[0].columnNames[0]

        return ctx.next({
          ...ctx,
          args: {
            ...ctx.args,
            where: {
              ...ctx.args.where,
              [inverseForeignKeyName]: ctx.source[entityPrimaryKey],
            },
          },
        })
      }

      t.crud[fieldNamingStrategy.findMany(relation.propertyName, relatedEntityTypeName)](
        relation.propertyName,
        {
          resolve:
            config && config.resolve
              ? ctx =>
                  config.resolve!({
                    ...ctx,
                    next: nextCtx => {
                      return resolve({ ...nextCtx, next: ctx.next }) as Promise<any[]>
                    },
                  })
              : resolve,
        },
      )
    } else {
      // Is ManyToOne or OneToOne
      const foreignKeys =
        relation.inverseRelation && relation.inverseRelation.foreignKeys.length > 0
          ? relation.inverseRelation.foreignKeys[0]
          : relation.foreignKeys[0]
      const sourceForeignKey = foreignKeys.columnNames[0]
      const isRelationOwner = relation.isOneToOneOwner || relation.isManyToOne
      const resolve: GraphQLFieldResolver<any, any, any> = (source, _, context) => {
        if (source[relation.propertyName]) {
          return source[relation.propertyName]
        }

        if (isRelationOwner && !Object.prototype.hasOwnProperty.call(source, sourceForeignKey)) {
          if (!context || !context.ignoreErrors) {
            throw new Error(
              `Foreign key '${sourceForeignKey}' is not defined in ${entityMetadata.name} schema`,
            )
          }

          return null
        }

        if (!isRelationOwner) {
          return getConnection()
            .getRepository(relatedEntity)
            .findOne({ [sourceForeignKey]: source[entityPrimaryKey] })
        }

        return getConnection()
          .getRepository(relatedEntity)
          .findOne(source[sourceForeignKey])
      }

      t.field(fieldName, {
        type: relatedEntityTypeName,
        resolve: resolve,
      })
    }
  }
}

function buildColumnFieldPublisher(entity: Function, schemaBuilder: SchemaBuilder) {
  return (
    { typeDef: t, builder }: OutputPropertyFactoryConfig<any>,
    column: ColumnMetadata,
    config?: EntityOutputMethodConfig<any>,
  ) => {
    let type: string | undefined

    if (column.type === 'enum') {
      type = schemaBuilder.useType(builder, {
        type: 'enum',
        entity,
        column,
      })
    } else {
      type = columnToGraphQLTypeDef(column, entity)
    }

    t.field((config && config.alias) || column.propertyName, {
      type,
      list: column.isArray || undefined,
      nullable: column.isNullable,
      resolve:
        config && config.resolve
          ? (source, args, ctx, info) => {
              config.resolve!({
                source,
                args,
                ctx,
                info,
                next: () => source[column.propertyName],
              })
            }
          : undefined,
    })
  }
}
export function buildEntityFieldOutputMethod(schemaBuilder: SchemaBuilder) {
  const cache: {
    [typeName: string]: {
      entity: Function
      entityMetadata: EntityMetadata
      columnFieldPublisher: ReturnType<typeof buildColumnFieldPublisher>
      relationFieldPublisher: ReturnType<typeof buildRelationFieldPublisher>
    }
  } = {}
  return Nexus.dynamicOutputMethod({
    name: 'entityField',
    factory: factoryConfig => {
      const { typeName } = factoryConfig
      const [fieldName, config] = factoryConfig.args as [
        string,
        EntityOutputMethodConfig<any> | undefined,
      ]

      if (!cache[typeName]) {
        const [entity, entityMetadata] = schemaBuilder.getEntityDataTupleByTypeName(typeName)
        cache[typeName] = {
          entity,
          entityMetadata,
          columnFieldPublisher: buildColumnFieldPublisher(entity, schemaBuilder),
          relationFieldPublisher: buildRelationFieldPublisher(entity, schemaBuilder),
        }
      }

      const relation = cache[typeName].entityMetadata.findRelationWithPropertyPath(fieldName)
      if (relation) {
        return cache[typeName].relationFieldPublisher(factoryConfig, relation, config)
      }

      const column = cache[typeName].entityMetadata.findColumnWithPropertyPath(fieldName)
      if (column) {
        return cache[typeName].columnFieldPublisher(factoryConfig, column, config)
      }

      throw new Error(`Unable to find column or relation named '${fieldName}' at '${typeName}'`)
    },
  })
}
