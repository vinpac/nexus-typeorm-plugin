import { getDecoratedEntities } from './decorators'
import { SchemaBuilder } from './schema-builder'
import { GraphQLDateTime } from 'graphql-iso-date'
import { DynamicOutputMethodDef } from 'nexus/dist/core'
import { GraphQLScalarType } from 'graphql'
import { DynamicOutputPropertyDef } from 'nexus/dist/dynamicProperty'
import { buildEntityOutputProperty } from './nexus/entity-output-property'
import { buildEntityFieldsOutputMethod } from './nexus/entity-fields-output-method'
import { buildEntityFieldOutputMethod } from './nexus/entity-field-output-method'
import { buildCRUDOutputProperty } from './nexus/crud-output-property'
import { buildCRUDOutputMethod } from './nexus/crud-output-method'

export function nexusTypeORMPlugin(): Array<
  | DynamicOutputPropertyDef<any>
  | DynamicOutputMethodDef<any>
  | DynamicOutputMethodDef<any>
  | GraphQLScalarType
> {
  const schemaBuilder = SchemaBuilder.fromEntitiesList(getDecoratedEntities())

  return [
    buildEntityFieldOutputMethod(schemaBuilder),
    buildCRUDOutputMethod(schemaBuilder),
    buildEntityOutputProperty(schemaBuilder),
    buildEntityFieldsOutputMethod(schemaBuilder),
    buildCRUDOutputProperty(schemaBuilder),
    GraphQLDateTime,
  ]
}
