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
  GraphQLString,
} from 'graphql'

import { getDatabaseObjectMetadata, TypeGraphORMField } from '.'
import { typeORMColumnTypeToGraphQLOutputType } from './type'
import { getRelationsForQuery, graphQLObjectValueToObject } from './util'
import { createArgs, translateWhereClause } from './where'

interface BuildExecutableSchemaOptions {
  entities: any[]
  defaultLimit?: number
  maxLimit?: number
}

export interface SchemaInfo {
  whereInputTypes: {[key: string]: GraphQLInputObjectType}
  types: {[key: string]: GraphQLOutputType}
}

export function buildExecutableSchema<TSource = any, TContext = any>({
  entities,
  defaultLimit,
  maxLimit,
}: BuildExecutableSchemaOptions): GraphQLSchema {
  const conn = TypeORM.getConnection()
  const schemaInfo: SchemaInfo = {
    whereInputTypes: {},
    types: {},
  }

  const rootQueryFields: GraphQLFieldConfigMap<TSource, TContext> = {}

  function addSubqueries(
    qb: TypeORM.SelectQueryBuilder<any>,
    fields: TypeGraphORMField<any, any>[],
    alias: string,
  ) {
    fields.forEach(field => {
      if (field.addSelect) {
        qb.addSelect(
          sq => field.addSelect(sq, {}, alias),
          `${alias}_${field.propertyKey}`,
        )
      }
    })
  }

  for (const entity of entities) {
    const meta = getDatabaseObjectMetadata(entity.prototype)
    const typeormMetadata = conn.getMetadata(entity)
    const { name } = typeormMetadata
    const args = createArgs(schemaInfo, entity)

    const type = new GraphQLObjectType({
      name,
      fields: () => {
        const fields: GraphQLFieldConfigMap<TSource, TContext> = {}

        meta.fields.forEach(field => {
          fields[field.propertyKey] = {
            type: GraphQLString,
          }
        })

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

    if (meta.queryFieldName) {
      rootQueryFields[meta.queryFieldName] = {
        args,
        type: GraphQLList(type),
        async resolve(..._args: Parameters<GraphQLFieldResolver<any, any, any>>) {
          const [, args, , info] = _args

          const _conn = TypeORM.getConnection()
          const relations = getRelationsForQuery(entity, info)

          const qb = _conn.getRepository(entity).createQueryBuilder()

          relations.forEach(relation => {
            if (typeof relation.type === 'string') {
              // TODO: support string typed relation
              throw new Error(`String typed relation is not supported yet.`)
            } else {
              const relationMeta = getDatabaseObjectMetadata(relation.type.prototype)

              const entities = relation.relationPath.split('.')
              const lastPath = entities[entities.length - 1]
              const prevEntities = [typeormMetadata.name].concat(entities.slice(0, entities.length - 1))

              const joinPath = `${prevEntities.join('_')}.${lastPath}`
              const alias = `${prevEntities.join('_')}_${lastPath}`

              addSubqueries(qb, relationMeta.fields, alias)

              const { arguments: fieldArgs } = relation.fieldNode

              const [clause, params] = (() => {
                if (fieldArgs) {
                  const whereArg = fieldArgs.find(arg => arg.name.value === 'where')

                  if (whereArg) {
                    const whereArgObject = graphQLObjectValueToObject(whereArg.value)
                    return translateWhereClause(
                      alias,
                      whereArgObject,
                      relation.relationPath,
                    )
                  }
                }
                return []
              })()

              qb.leftJoinAndSelect(joinPath, alias, clause, params)
            }
          })

          addSubqueries(qb, meta.fields, typeormMetadata.name)

          if (args.where) {
            const [ clause, params ] = translateWhereClause(typeormMetadata.name, args.where)
            qb.where(clause, params)
          }

          if (args.skip) {
            qb.skip(args.skip)
          }

          const take = Math.max(args.first || defaultLimit || 30, maxLimit || 100)
          qb.take(take)

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
