import { EntityTypeDefManager } from '../entity-type-def-manager'
import * as Nexus from 'nexus'
import { EntityMetadata, getConnection } from 'typeorm'
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata'
import { OutputPropertyFactoryConfig } from 'nexus/dist/dynamicProperty'
import { RelationMetadata } from 'typeorm/metadata/RelationMetadata'
import { GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql'
import { namingStrategy } from './naming-strategy'
import { getEntityTypeName, getEntityPrimaryColumn } from '../util'
import { propertyPathToAlias } from '../query-builder'
import { FindManyFieldConfig, FindManyFieldNextFnExtraContext } from './crud/find-many-field'
import { CRUDFieldConfigResolveFn } from './crud-output-method'

declare global {
  export interface NexusTypeORMEntityOutputMethod<TEntity> {
    (fieldName: keyof TEntity, config?: EntityOutputMethodConfig<TEntity>): void
  }
}

interface BaseEntityOutputMethodConfig {
  alias?: string
  type?: Nexus.core.AllOutputTypes
  filtering?: boolean
  ordering?: boolean
}

interface ColumnEntityOutputMethodConfigResolveFn<
  TPayload,
  TSource = any,
  TArgs = { [argName: string]: any },
  TContext = any
> {
  (ctx: { source: TSource; args: TArgs; context: TContext; info: GraphQLResolveInfo }): TPayload
}

export interface ColumnEntityOutputMethodConfig<TEntity, TPayload> {
  alias?: string
  resolve?: ColumnEntityOutputMethodConfigResolveFn<TPayload, TEntity>
}

export interface UniqueEntityOutputMethodConfig<TType> extends BaseEntityOutputMethodConfig {
  resolve?: CRUDFieldConfigResolveFn<TType, {}>
  pagination?: true
}

export interface PaginationEntityOutputMethodConfig<TType> extends BaseEntityOutputMethodConfig {
  resolve?: CRUDFieldConfigResolveFn<TType[], FindManyFieldNextFnExtraContext>
  pagination?: false
}

export type EntityOutputMethodConfig<TType> =
  | ColumnEntityOutputMethodConfig<TType, any>
  | UniqueEntityOutputMethodConfig<TType>
  | PaginationEntityOutputMethodConfig<TType>

function buildRelationFieldPublisher(entity: Function, manager: EntityTypeDefManager) {
  return (
    { typeDef: t }: OutputPropertyFactoryConfig<any>,
    relation: RelationMetadata,
    config?: EntityOutputMethodConfig<any>,
  ) => {
    const fieldName = config && config.alias ? config.alias : relation.propertyName
    const entityMetadata = manager.entitiesMetadata[entity.name]
    const relatedEntity = manager.entities[relation.inverseEntityMetadata.name]
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

      const resolve: FindManyFieldConfig<any>['resolve'] = ctx => {
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
              ...(ctx.args.where as any),
              [inverseForeignKeyName]: ctx.source[entityPrimaryKey],
            },
          },
        })
      }
      ;(t.crud as any)[namingStrategy.findManyField(relatedEntityTypeName)](relation.propertyName, {
        resolve:
          config && config.resolve
            ? (ctx: any) =>
                config.resolve!({
                  ...ctx,
                  next: (nextCtx: any) => {
                    return resolve({ ...nextCtx, next: ctx.next }) as Promise<any[]>
                  },
                })
            : resolve,
      })
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

function buildColumnFieldPublisher(entity: Function, manager: EntityTypeDefManager) {
  return (
    { typeDef: t, builder }: OutputPropertyFactoryConfig<any>,
    column: ColumnMetadata,
    config?: EntityOutputMethodConfig<any>,
  ) => {
    const type = manager.entityColumnToTypeName(
      entity,
      column,
      builder,
    ) as Nexus.core.AllOutputTypes

    t.field((config && config.alias) || column.propertyName, {
      type,
      list: column.isArray || undefined,
      nullable: column.isNullable,
      resolve:
        config && config.resolve
          ? (source, args, context, info) => {
              config.resolve!({
                source,
                args,
                context,
                info,
                next: () => source[column.propertyName],
              })
            }
          : undefined,
    })
  }
}
export function buildEntityFieldOutputMethod(manager: EntityTypeDefManager) {
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
    typeDefinition: ': NexusTypeORMEntityOutputMethod<NexusTypeORMEntity<TypeName>>',
    factory: factoryConfig => {
      const { typeName } = factoryConfig
      const [fieldName, config] = factoryConfig.args as [
        string,
        EntityOutputMethodConfig<any> | undefined,
      ]

      if (!cache[typeName]) {
        const [entity, entityMetadata] = manager.getEntityDataTupleByTypeName(typeName)
        cache[typeName] = {
          entity,
          entityMetadata,
          columnFieldPublisher: buildColumnFieldPublisher(entity, manager),
          relationFieldPublisher: buildRelationFieldPublisher(entity, manager),
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
