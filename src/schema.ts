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
} from 'graphql'

import { getDatabaseObjectMetadata } from '.'
import { typeORMColumnTypeToGraphQLOutputType } from './type'
import { getRelationsForQuery } from './util'
import { createArgs, translateWhereClause } from './where'

interface BuildExecutableSchemaOptions {
  entities: any[]
}

export function buildExecutableSchema<TSource = any, TContext = any>({
  entities,
}: BuildExecutableSchemaOptions): GraphQLSchema {
  const conn = TypeORM.getConnection()

  const types: {[key: string]: GraphQLOutputType} = {}

  function findGraphQLTypeByName(key: string): GraphQLOutputType | undefined {
    return types[key]
  }

  const rootQueryFields: GraphQLFieldConfigMap<TSource, TContext> = {}

  for (const entity of entities) {
    const meta = getDatabaseObjectMetadata(entity.prototype)
    const typeormMetadata = conn.getMetadata(entity)
    const { name } = typeormMetadata

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
          const targetGraphQLType = findGraphQLTypeByName(targetMeta.name)
          const { relationType } = relation

          if (targetGraphQLType) {
            const type =
              relationType === 'one-to-many' ? GraphQLList(targetGraphQLType) :
                relationType === 'many-to-one' ? targetGraphQLType :
                  undefined

            if (type) {
              fields[relation.propertyName] = {
                type,
              }
            }
          }
        })

        return fields
      }
    })

    types[name] = type

    if (meta.queryFieldName) {
      rootQueryFields[meta.queryFieldName] = {
        args: createArgs(entity),
        type: GraphQLList(type),
        async resolve(..._args: Parameters<GraphQLFieldResolver<any, any, any>>) {
          const [, args, , info] = _args

          const _conn = TypeORM.getConnection()
          const relations = getRelationsForQuery(entity, info)

          const qb = _conn.getRepository(entity).createQueryBuilder()

          relations.forEach(relation => {
            const entities = relation.split('.')
            const lastPath = entities[entities.length - 1]
            const prevEntities = [typeormMetadata.name].concat(entities.slice(0, entities.length - 1))

            const joinPath = `${prevEntities.join('_')}.${lastPath}`
            const alias = `${prevEntities.join('_')}_${lastPath}`

            qb.leftJoinAndSelect(joinPath, alias)
          })

          if (args.where) {
            qb.where(translateWhereClause(typeormMetadata.name, args.where))
          }

          if (args.skip) {
            qb.skip(args.skip)
          }

          if (args.first) {
            qb.take(args.first)
          }

          return qb.getMany()
        },
      }
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

  return new GraphQLSchema(config)
}
