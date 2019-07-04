import * as TypeORM from 'typeorm'
import {
  GraphQLString, GraphQLInt, GraphQLOutputType, GraphQLInputType, GraphQLBoolean,
  GraphQLEnumValueConfig, GraphQLEnumType,
} from 'graphql'
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata'

import { SchemaInfo } from './schema'
import { makeFirstLetterUpperCase } from './util'
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

export function columnToGraphQLType(
  column: ColumnMetadata,
  entity: any,
  schemaInfo: SchemaInfo,
): GraphQLOutputType | undefined {
  if (column.type === 'enum' && column.enum) {
    const conn = TypeORM.getConnection()
    const typeormMetadata = conn.getMetadata(entity)

    const values = column.enum.reduce<{[key: string]: GraphQLEnumValueConfig}>((prev, value) => {
      const stringValue = value.toString()
      prev[stringValue] = {
        value,
      }
      return prev
    }, {})

    const name = `${typeormMetadata.name}${makeFirstLetterUpperCase(column.propertyName)}`
    const enumType = new GraphQLEnumType({
      name,
      values,
    })

    schemaInfo.enumTypes[name] = enumType
    return enumType
  }

  return typeORMColumnTypeToGraphQLOutputType(column.type)
}
