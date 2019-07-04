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
import { typeORMColumnTypeToGraphQLOutputType } from './type'
import { createArgs, translateWhereClause } from './where'
import { orderNamesToOrderInfos } from './order'
import { resolve } from './resolver'
import { orderItemsByPrimaryColumns } from './util'

interface BuildExecutableSchemaOptions {
  entities: any[]
  enhanceConfig?: (
    config: GraphQLSchemaConfig,
    schemaInfo: SchemaInfo,
  ) => GraphQLSchemaConfig
}

export interface SchemaInfo {
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

    const type = new GraphQLObjectType({
      name,
      fields: () => {
        const fields: GraphQLFieldConfigMap<TSource, TContext> = {}

        typeormMetadata.columns.forEach(column => {
          const graphqlType = typeORMColumnTypeToGraphQLOutputType(column.type)

          if (graphqlType) {
            fields[column.propertyName] = {
              type: graphqlType,
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
                type,
              }
            }
          }
        })

        return fields
      }
    })

    schemaInfo.types[name] = type

    if (meta.views) {
      meta.views.forEach(view => {
        if ('isDirectView' in view) {
          rootQueryFields[view.name] = {
            args,
            type: GraphQLNonNull(GraphQLList(type)),

            async resolve(..._args: Parameters<GraphQLFieldResolver<any, any, any>>) {
              const [, args, , info] = _args

              return resolve({
                where: args.where ? translateWhereClause(typeormMetadata.name, args.where) : undefined,
                entity,
                skip: args.skip || undefined,
                take: args.first || undefined,
                orders: args.orderBy ? orderNamesToOrderInfos(args.orderBy) : undefined,
                info,
              })
            }
          }
        } else {
          rootQueryFields[view.name] = {
            args: view.args,
            type: 'getIds' in view ? GraphQLNonNull(GraphQLList(type)) : type,

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
