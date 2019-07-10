import * as TypeORM from 'typeorm'
import {
  GraphQLFieldConfigMap,
  GraphQLFieldResolver,
  GraphQLList,
  GraphQLObjectType,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
  GraphQLSchema,
  GraphQLSchemaConfig,
  GraphQLInputObjectType,
  GraphQLEnumType,
  GraphQLNonNull,
} from 'graphql'

import { getDatabaseObjectMetadata } from '.'
import { columnToGraphQLType } from './type'
import { createArgs, translateWhereClause } from './where'
import { orderNamesToOrderInfos } from './order'
import { resolve, resolveSingleField } from './resolver'
import { orderItemsByPrimaryColumns } from './util'

interface BuildExecutableSchemaOptions {
  entities: any[]
  enhanceConfig?: (
    config: GraphQLSchemaConfig,
    schemaInfo: SchemaInfo,
  ) => GraphQLSchemaConfig
}

export interface SchemaInfo {
  enumTypes: {[key: string]: GraphQLEnumType}
  whereInputTypes: {[key: string]: GraphQLInputObjectType}
  types: {[key: string]: GraphQLOutputType}
  orderByInputTypes: {[key: string]: GraphQLEnumType}
}

export function buildExecutableSchema<TSource = any, TContext = any>({
  enhanceConfig,
  entities,
}: BuildExecutableSchemaOptions): GraphQLSchema {
  const conn = TypeORM.getConnection()
  const schemaInfo: SchemaInfo = {
    enumTypes: {},
    whereInputTypes: {},
    types: {},
    orderByInputTypes: {},
  }

  const rootQueryFields: GraphQLFieldConfigMap<TSource, TContext> = {}

  for (const entity of entities) {
    const meta = getDatabaseObjectMetadata(entity.prototype)
    const typeormMetadata = conn.getMetadata(entity)
    const { name } = typeormMetadata
    const args = createArgs(schemaInfo, entity)

    const entityGraphQLType = new GraphQLObjectType({
      name,
      fields: () => {
        const fields: GraphQLFieldConfigMap<TSource, TContext> = {}

        meta.fields.forEach(field => {
          if (field.type && field.resolve) {
            const { type, resolve } = field
            fields[field.propertyKey] = {
              type: typeof type === 'string' ? schemaInfo.types[type] : type,
              resolve,
            }
          }
        })

        function getFieldMetadata(name: string) {
          return meta.fields.find(field => field.propertyKey === name)
        }

        typeormMetadata.columns.forEach(column => {
          const field = getFieldMetadata(column.propertyName)
          const graphqlType =
            (field && (
              typeof field.type === 'string' ?
                schemaInfo.types[field.type] :
                field.type
            )) ||
            columnToGraphQLType(column, entity, schemaInfo)

          const isNullable = (() => {
            if (field && typeof field.nullable === 'boolean') {
              return field.nullable
            }
            return column.isNullable
          })()

          if (graphqlType) {
            fields[column.propertyName] = {
              type: isNullable ? graphqlType : GraphQLNonNull(graphqlType),
              async resolve(source: any, _, ctx, info) {
                return resolveSingleField(column.propertyName, entity, source, ctx, info)
              }
            }
          }
        })

        typeormMetadata.relations.forEach(relation => {
          const targetMeta = conn.getMetadata(relation.type)
          const targetGraphQLType = schemaInfo.types[targetMeta.name]
          const { relationType } = relation

          if (targetGraphQLType) {
            const type =
              relationType === 'one-to-many' ? GraphQLList(targetGraphQLType) :
                relationType === 'many-to-one' ? targetGraphQLType :
                  undefined

            if (type) {
              fields[relation.propertyName] = {
                args: createArgs(schemaInfo, relation.type),
                type: relation.isNullable ? type : GraphQLNonNull(type),
                async resolve(source: any, _, ctx, info) {
                  return resolveSingleField(relation.propertyName, entity, source, ctx, info)
                }
              }
            }
          }
        })

        return fields
      }
    })

    schemaInfo.types[name] = entityGraphQLType

    if (meta.views) {
      meta.views.forEach(view => {
        if ('isDirectView' in view) {
          rootQueryFields[view.name] = {
            args,
            type: GraphQLNonNull(GraphQLList(entityGraphQLType)),

            async resolve(..._args: Parameters<GraphQLFieldResolver<any, any, any>>) {
              const [, args, ctx, info] = _args

              return resolve({
                where: args.where ? translateWhereClause(typeormMetadata.name, args.where) : undefined,
                entity,
                skip: args.skip || undefined,
                take: args.first || undefined,
                orders: args.orderBy ? orderNamesToOrderInfos(args.orderBy) : undefined,
                info,
                ctx,
              })
            }
          }
        } else {
          rootQueryFields[view.name] = {
            args: view.args,
            type: 'getIds' in view ? GraphQLNonNull(GraphQLList(entityGraphQLType)) : entityGraphQLType,

            async resolve(..._args: Parameters<GraphQLFieldResolver<any, any, any>>) {
              const [, args, ctx, info] = _args
              const ids = await (async () => {
                if ('getIds' in view) {
                  return view.getIds({
                    args,
                    ctx,
                  })
                }
                return [await view.getId({
                  args,
                  ctx,
                })]
              })()

              const resolved = await resolve({
                entity,
                info,
                ids,
                ctx,
              })

              if ('getId' in view) {
                return resolved[0]
              }

              if (typeormMetadata.hasMultiplePrimaryKeys) {
                return resolved
              }
              return orderItemsByPrimaryColumns(typeormMetadata.primaryColumns, resolved, ids)
            }
          }
        }
      })
    }
  }

  const queryConfig: GraphQLObjectTypeConfig<TSource, TContext> = {
    name: 'Query',
    fields: rootQueryFields,
  }

  const query: GraphQLSchemaConfig['query'] = new GraphQLObjectType(queryConfig)

  const config: GraphQLSchemaConfig = {
    query,
  }

  return new GraphQLSchema(
    enhanceConfig ?
      enhanceConfig(config, schemaInfo) :
      config
  )
}
