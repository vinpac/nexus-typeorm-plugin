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

function combineExpressions(clauses: string[], operator: 'AND' | 'OR') {
  return `(${clauses.filter(clause => clause).join(` ${operator} `)})`
}

function combineParams(params: {[key: string]: any}[]) {
  return params.reduce<{[key: string]: any}>((merged, param) => {
    Object.keys(param).forEach(key => {
      merged[key] = param[key]
    })
    return merged
  }, {})
}

export function translateWhereClause(
  entity: string,
  where: any,
  conditionPrefix: string = '',
): [string, {[key: string]: any}] {
  const clauses = Object.keys(where).reduce<[string, {[key: string]: string}][]>(
    (_clauses, key) => {
      const uniqueKey = `${conditionPrefix}_${key}`

      if (key === 'OR' || key === 'AND') {
        const subclauses: any[] = where[key]
        const subExpAndParams = subclauses.map(
          (subclause, idx) => translateWhereClause(entity, subclause, `${uniqueKey}_${idx}`),
        )

        const subexpression = combineExpressions(subExpAndParams.map(sub => sub[0]), key)
        const subparams = combineParams(subExpAndParams.map(sub => sub[1]))

        _clauses.push([
          subexpression,
          subparams,
        ])
      } else if (key === 'NOT') {
        const subclause = where[key]
        const [ subexp, subparams ] = translateWhereClause(entity, subclause, uniqueKey)

        _clauses.push([
          `NOT ${subexp}`,
          subparams,
        ])
      } else {
        const keySplitted = key.split('_')
        const operation = keySplitted[keySplitted.length - 1]
        const operator =
          (keySplitted.length > 1 && operations.includes(operation)) ?
            operationToOperator(operation) :
            '='
        const targetKey = keySplitted.length === 1 ?
          keySplitted[0] :
          keySplitted.slice(0, -1).join('_')

        if (operator) {
          _clauses.push([
            `${entity}.${targetKey} ${operator} :${uniqueKey}`,
            { [uniqueKey]: where[key] },
          ])
        } else {
          throw new Error(`Unknown operation: ${operation}`)
        }
      }

      return _clauses
    },
    [],
  )

  return [
    combineExpressions(
      clauses.map(clause => clause[0]), 'AND'
    ),
    combineParams(
      clauses.map(clause => clause[1])
    )
  ]
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
      ...createBaseWhereInputFromColumns(columns),
      NOT: {
        type: inputType,
      },
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
