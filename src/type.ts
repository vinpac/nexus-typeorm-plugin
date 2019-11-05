import * as TypeORM from 'typeorm'
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata'
import { makeFirstLetterUpperCase } from './util'
import { enumType } from 'nexus'

function typeORMColumnTypeToGraphQLType(columnType: TypeORM.ColumnType) {
  if (columnType === 'uuid') {
    return 'ID'
  } else if (
    columnType === String ||
    columnType === 'varchar' ||
    columnType === 'text' ||
    columnType === 'tinytext' ||
    columnType === 'json' ||
    columnType === 'simple-json' ||
    columnType === 'xml' ||
    columnType === 'varchar2' ||
    columnType === 'varying character' ||
    columnType === 'char' ||
    columnType === 'character' ||
    columnType === 'longtext' ||
    columnType === 'longblob' ||
    columnType === 'time' ||
    columnType === 'character varying'
  ) {
    return 'String'
  } else if (
    columnType === Number ||
    columnType === 'int' ||
    columnType === 'int2' ||
    columnType === 'int4' ||
    columnType === 'int8' ||
    columnType === 'int64' ||
    columnType === 'integer' ||
    columnType === 'unsigned big int' ||
    columnType === 'double' ||
    columnType === 'bigint'
  ) {
    return 'Int'
  else if (columnType === 'float' ||
    columnType === 'bestelbon' ||
    columnType === 'float4' ||
    columnType === 'float8' ||
    columnType === 'decimal') {
    return 'Float'
  } else if (columnType === Boolean || columnType === 'bool' || columnType === 'boolean') {
    return 'Boolean'
  } else if (
    columnType === 'timestamp' ||
    columnType === 'date' ||
    columnType === 'datetime' ||
    columnType === 'datetime2'
  ) {
    return 'DateTime'
  }
}

export function columnToGraphQLTypeDef(column: ColumnMetadata, entity: Function): string {
  if (column.isPrimary) {
    return 'ID'
  }

  const typeName = typeORMColumnTypeToGraphQLType(column.type)
  if (!typeName) {
    throw new Error(
      `Couldn't find a matching GraphQL Type to '${column.type}' at ${entity.name} Entity`,
    )
  }
  return typeName
}

export function enumColumnToGraphQLObject(entity: any, column: ColumnMetadata) {
  const { name: entityName } = TypeORM.getConnection().getMetadata(entity)
  const typeName = `${entityName}${makeFirstLetterUpperCase(column.propertyName)}Enum`

  return enumType({
    name: typeName,
    members: column.enum!.map(String)!,
  })
}
