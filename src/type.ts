import * as TypeORM from 'typeorm'
import { GraphQLString, GraphQLInt, GraphQLOutputType, GraphQLInputType, GraphQLBoolean } from 'graphql'

import { GraphQLCustomDate } from './scalars'

function _typeORMColumnTypeToGraphQLType(columnType: TypeORM.ColumnType) {
  if (columnType === String) {
    return GraphQLString
  } else if (columnType === Number) {
    return GraphQLInt
  } else if (columnType === Boolean) {
    return GraphQLBoolean
  } else if (columnType === 'timestamp') {
    return GraphQLCustomDate
  }
}

export function typeORMColumnTypeToGraphQLOutputType(columnType: TypeORM.ColumnType): GraphQLOutputType | undefined {
  return _typeORMColumnTypeToGraphQLType(columnType)
}

export function typeORMColumnTypeToGraphQLInputType(columnType: TypeORM.ColumnType): GraphQLInputType | undefined {
  return _typeORMColumnTypeToGraphQLType(columnType)
}
