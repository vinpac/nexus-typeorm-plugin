import { EntityTypeDefManager } from './entity-type-def-manager'
import { writeFileSync } from 'fs'
import { getEntityTypeName } from './util'
import { namingStrategy } from './nexus/naming-strategy'
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata'
import mkdirp = require('mkdirp')
import * as path from 'path'

interface InterfaceMapShape {
  [interfaceName: string]: { [fieldName: string]: string }
}
function typeORMColumnToGraphQLType(column: ColumnMetadata) {
  let typeName: string | undefined
  const columnType = column.type

  if (columnType === 'enum') {
    typeName = column.enum
      ? `(${column.enum.map(value => JSON.stringify(value)).join(' | ')})`
      : 'undefined'
  } else if (
    columnType === 'uuid' ||
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
    columnType === 'character varying' ||
    columnType == 'mediumtext' ||
    columnType == 'tinyblob' ||
    columnType == 'mediumblob' ||
    columnType == 'blob' ||
    columnType == 'nchar' ||
    columnType == 'national char' ||
    columnType == 'nvarchar' ||
    columnType == 'national varchar' ||
    columnType === 'timestamp' ||
    columnType === 'date' ||
    columnType === 'datetime' ||
    columnType === 'datetime2'
  ) {
    typeName = 'string'
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
    columnType === 'bigint' ||
    columnType === 'float' ||
    columnType === 'float4' ||
    columnType === 'float8' ||
    columnType === 'decimal'
  ) {
    typeName = 'number'
  } else if (columnType === Boolean || columnType === 'bool' || columnType === 'boolean') {
    typeName = 'boolean'
  }

  if (!typeName) {
    throw new Error(
      `Couldn't find a matching Typescript Type to '${column.type}' at ${column.entityMetadata.name} Entity`,
    )
  }

  if (column.isArray) {
    typeName += '[]'
  }

  if (column.isNullable) {
    typeName += '| null'
  }

  return typeName
}

export function writeTypeGen(
  outputPath: string,
  manager: EntityTypeDefManager,
  format?: (fileBody: string) => string,
) {
  const entitiesInterfaces: InterfaceMapShape = {}
  const entityPropertyInterfaces: InterfaceMapShape = {}
  const crudPropertyInterfaces: InterfaceMapShape = {
    Mutation: {},
    Query: {},
  }
  Object.keys(manager.entities).forEach(key => {
    const entity = manager.entities[key]
    const entityTypeName = getEntityTypeName(entity)
    const entityMetadata = manager.getEntityMetadata(entity)

    entitiesInterfaces[entityTypeName] = {}
    entityPropertyInterfaces[entityTypeName] = {}

    entityMetadata.columns.forEach(column => {
      entitiesInterfaces[entityTypeName][column.propertyName] = typeORMColumnToGraphQLType(column)
      entityPropertyInterfaces[entityTypeName][
        column.propertyName
      ] = `EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'${entityTypeName}'>>`
    })

    entityMetadata.relations.forEach(relation => {
      const relatedEntityTypeName = getEntityTypeName(
        manager.entities[relation.inverseEntityMetadata.name],
      )
      const isArray = relation.isOneToMany || relation.isManyToMany
      entitiesInterfaces[entityTypeName][
        relation.propertyName
      ] = `NexusTypeORMEntity<'${relatedEntityTypeName}'>${isArray ? '[]' : ''}${
        relation.isNullable ? '| null' : ''
      }`
      entityPropertyInterfaces[entityTypeName][relation.propertyName] = isArray
        ? `EntityPropertyFindManyFieldPublisher<NexusTypeORMEntity<'${relatedEntityTypeName}'>>`
        : `EntityPropertyFindOneFieldPublisher<NexusTypeORMEntity<'${relatedEntityTypeName}'>>`
    })

    crudPropertyInterfaces.Query[
      namingStrategy.findOneField(entityTypeName)
    ] = `CRUDPropertyFindOneFieldPublisher<NexusTypeORMEntity<'${entityTypeName}'>>`
    crudPropertyInterfaces.Query[
      namingStrategy.findManyField(entityTypeName)
    ] = `CRUDPropertyFindManyFieldPublisher<NexusTypeORMEntity<'${entityTypeName}'>>`
    crudPropertyInterfaces.Mutation[
      namingStrategy.createOneFieldName(entityTypeName)
    ] = `CRUDPropertyCreateOneFieldPublisher<NexusTypeORMEntity<'${entityTypeName}'>>`
  })

  const convertSubInterfaceMapToString = (
    interfaceName: string,
    shape: InterfaceMapShape,
    identation = '',
  ) => {
    let str = `${identation}export interface ${interfaceName} {\n`
    Object.keys(shape).forEach(interfaceName => {
      str += `${identation}  '${interfaceName}': {\n`
      Object.keys(shape[interfaceName]).forEach(propertyName => {
        str += `${identation}    ${propertyName}: ${shape[interfaceName][propertyName]}\n`
      })
      str += `${identation}  }\n`
    })

    str += `${identation}}`
    return str
  }

  let body = `
import {
  EntityPropertyColumnDefFieldPublisher,
  EntityPropertyFindOneFieldPublisher,
  EntityPropertyFindManyFieldPublisher,
  CRUDPropertyFindOneFieldPublisher,
  CRUDPropertyFindManyFieldPublisher,
  CRUDPropertyCreateOneFieldPublisher
} from 'nexus-typeorm-plugin'

declare global {
${convertSubInterfaceMapToString('NexusTypeORMEntities', entitiesInterfaces, '  ')}

${convertSubInterfaceMapToString('NexusTypeORMCRUDPropertyMap', crudPropertyInterfaces, '  ')}

${convertSubInterfaceMapToString('NexusTypeORMEntityPropertyMap', entityPropertyInterfaces, '  ')}

  export type NexusTypeORMEntityProperty<TypeName> =
    TypeName extends keyof NexusTypeORMEntityPropertyMap
      ? NexusTypeORMEntityPropertyMap[TypeName]
      : undefined

  export type NexusTypeORMCRUDProperty<TypeName> = TypeName extends 'Mutation'
    ? NexusTypeORMCRUDPropertyMap['Mutation']
    : NexusTypeORMCRUDPropertyMap['Query']

  export type NexusTypeORMEntity<
    TypeName
  > = TypeName extends keyof NexusTypeORMEntities ? NexusTypeORMEntities[TypeName] : undefined

  export type NexusTypeORMEntityFieldsOutputMethod<TypeName> =
    TypeName extends keyof NexusTypeORMEntityPropertyMap
      ? (() => void)
      : undefined
}
`

  if (format) {
    body = format(body)
  }

  mkdirp.sync(path.dirname(outputPath))
  writeFileSync(outputPath, body, 'utf8')
}
