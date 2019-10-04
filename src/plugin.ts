import { getDecoratedEntities } from './decorators'
import { SchemaBuilder } from './schema-builder'
import { createUniqueOutputMethod } from './nexus/unique-output-method copy'
import { createPaginationOutputMethod } from './nexus/pagination-output-method'
import {
  createEntityFieldOutputMethod,
  createEntityFieldsOutputMethod,
} from './nexus/entity-field-output-method'
import { GraphQLDateTime } from 'graphql-iso-date'
import { DynamicOutputMethodDef } from 'nexus/dist/core'
import { GraphQLScalarType } from 'graphql'

export function nexusTypeQLPlugin(): Array<DynamicOutputMethodDef<any> | GraphQLScalarType> {
  const schemaBuilder = SchemaBuilder.fromEntitiesList(getDecoratedEntities())

  return [
    createUniqueOutputMethod(schemaBuilder),
    createPaginationOutputMethod(schemaBuilder),
    createEntityFieldOutputMethod(schemaBuilder),
    createEntityFieldsOutputMethod(schemaBuilder),
    GraphQLDateTime,
  ]
}
