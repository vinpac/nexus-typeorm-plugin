import * as TypeORM from 'typeorm'
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata'
import { makeFirstLetterUpperCase } from './util'
import { getDatabaseObjectMetadata } from './decorators'
import { SchemaBuilder } from './schema-builder'

function typeORMColumnTypeToGraphQLType(columnType: TypeORM.ColumnType) {
  if (
    columnType === String ||
    columnType === 'varchar' ||
    columnType === 'varchar2' ||
    columnType === 'varying character' ||
    columnType === 'char' ||
    columnType === 'character' ||
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
    columnType === 'bigint'
  ) {
    return 'Int'
  } else if (columnType === 'float' || columnType === 'float4' || columnType === 'float8') {
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

export const createEntityEnumColumnTypeDefs = (
  entity: Function,
  column: ColumnMetadata,
  schemaBuilder: SchemaBuilder,
): SchemaBuilder => {
  if (!column.enum) {
    throw new Error(`Column passed to ${createEntityEnumColumnTypeDefs} is not an enum`)
  }

  const { name: entityName } = getDatabaseObjectMetadata(entity)

  if (schemaBuilder.meta[entityName].entityEnumColumnType[column.propertyName]) {
    return schemaBuilder
  }

  const typeName = `${entityName}${makeFirstLetterUpperCase(column.propertyName)}`
  return {
    ...schemaBuilder,
    typeDefs: `${schemaBuilder.typeDefs}
      enum ${typeName} {
        ${column.enum.join('\n\t\t')}
      }
    `,
    meta: {
      ...schemaBuilder.meta,
      [entityName]: {
        ...schemaBuilder.meta[entityName],
        entityEnumColumnType: {
          ...schemaBuilder.meta[entityName].entityEnumColumnType,
          [column.propertyName]: typeName,
        },
      },
    },
  }
}

export function columnToGraphQLTypeDef(column: ColumnMetadata, entity: Function): string {
  const typeName = typeORMColumnTypeToGraphQLType(column.type)
  if (!typeName) {
    throw new Error(
      `Couldn't find a matching GraphQL Type to '${column.type}' at ${entity.name} Entity`,
    )
  }
  return typeName
}
