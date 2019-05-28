import * as TypeORM from 'typeorm'
import { GraphQLInputObjectType, GraphQLInputObjectTypeConfig, GraphQLInt, GraphQLInputFieldConfigMap, GraphQLList, GraphQLFieldConfigArgumentMap } from 'graphql'
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata'

import { typeORMColumnTypeToGraphQLInputType } from './type'

const operations = ['lt', 'lte', 'gt', 'gte']

function operationToOperator(operation: string): string | undefined {
  if (operation === 'lt') {
    return '<'
  } else if (operation === 'lte') {
    return '<='
  } else if (operation === 'gt') {
    return '>'
  } else if (operation === 'gte') {
    return '>='
  }
}

export function translateWhereClause(entity: string, where: any): TypeORM.Brackets {
  return new TypeORM.Brackets(sq => {
    Object.keys(where).forEach(key => {
      if (key === 'OR' || key === 'AND') {
        const groupFn = key === 'OR' ? sq.orWhere : sq.andWhere
        const boundGroupFn = groupFn.bind(sq)
        const subclauses: any[] = where[key]
        subclauses.forEach(clause => {
          boundGroupFn(translateWhereClause(entity, clause))
        })
      } else {
        const keySplitted = key.split('_')
        const operation = keySplitted[keySplitted.length - 1]

        if (keySplitted.length > 1 && operations.includes(operation)) {
          const targetKey = keySplitted.slice(0, -1).join('_')
          const operator = operationToOperator(operation)

          if (operator) {
            sq.andWhere(`${entity}.${targetKey} ${operator} :${key}`, { [key]: where[key] })
          } else {
            throw new Error(`Unknown operation: ${operation}`)
          }
        } else {
          sq.andWhere(`${entity}.${key} = :${key}`, { [key]: where[key] })
        }
      }
    })

    return sq
  })
}

function createBaseWhereInputFromColumns(columns: ColumnMetadata[]): GraphQLInputFieldConfigMap {
  const config: GraphQLInputFieldConfigMap = {}

  columns.forEach(column => {
    const type = typeORMColumnTypeToGraphQLInputType(column.type)
    const { propertyName } = column

    if (type) {
      operations.forEach(operation => {
        config[`${propertyName}_${operation}`] = {
          type,
        }
      })

      config[column.propertyName] = {
        type,
      }
    }
  })

  return config
}

function createWhereInput(entityMeta: TypeORM.EntityMetadata): GraphQLInputObjectType {
  let inputType: GraphQLInputObjectType

  const { name, columns } = entityMeta

  const config: GraphQLInputObjectTypeConfig = {
    name: `${name}WhereInput`,
    fields: () => ({
      // TODO: implement NOT operator
      ...createBaseWhereInputFromColumns(columns),
      OR: {
        type: GraphQLList(inputType),
      },
      AND: {
        type: GraphQLList(inputType),
      },
    })
  }

  inputType = new GraphQLInputObjectType(config)
  return inputType
}

export function createArgs(entity: any): GraphQLFieldConfigArgumentMap {
  const conn = TypeORM.getConnection()
  const typeormMetadata = conn.getMetadata(entity)

  const args: GraphQLFieldConfigArgumentMap = {
    where: {
      type: createWhereInput(typeormMetadata),
    },
    skip: {
      type: GraphQLInt,
    },
    first: {
      type: GraphQLInt,
    },
  }

  return args
}
