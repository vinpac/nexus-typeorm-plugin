import * as TypeORM from 'typeorm'
import {
  GraphQLString, GraphQLInt, GraphQLOutputType, GraphQLInputType, GraphQLBoolean,
  GraphQLEnumValueConfig, GraphQLEnumType, GraphQLFloat,
} from 'graphql'
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata'

import { SchemaInfo } from './schema'
import { makeFirstLetterUpperCase } from './util'
import { GraphQLCustomDate } from './scalars'

function _typeORMColumnTypeToGraphQLType(columnType: TypeORM.ColumnType) {
  if (
    columnType === String ||
    columnType === 'varchar' ||
    columnType === 'varchar2' ||
    columnType === 'varying character' ||
    columnType === 'char' ||
    columnType === 'character' ||
    columnType === 'character varying'
  ) {
    return GraphQLString
  } else if (
    columnType === Number ||
    columnType === 'int' ||
    columnType === 'int2' ||
    columnType === 'int4' ||
    columnType === 'int8' ||
    columnType === 'int64' ||
    columnType === 'integer' ||
    columnType === 'unsigned big int' ||
    columnType === 'bigint'
  ) {
    return GraphQLInt
  } else if (
    columnType === 'float' ||
    columnType === 'float4' ||
    columnType === 'float8'
  ) {
    return GraphQLFloat
  } else if (
    columnType === Boolean ||
    columnType === 'bool' ||
    columnType === 'boolean'
  ) {
    return GraphQLBoolean
  } else if (
    columnType === 'timestamp' ||
    columnType === 'date' ||
    columnType === 'datetime' ||
    columnType === 'datetime2'
  ) {
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
