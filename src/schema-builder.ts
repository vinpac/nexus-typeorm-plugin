import { getDecoratedEntities, GraphQLEntityMetadata } from './decorators'
import { GraphQLFieldResolver, GraphQLType } from 'graphql'
import { mergeTypes } from 'merge-graphql-schemas'
import { GraphQLID } from './scalars'
import { GraphQLDateTime } from 'graphql-iso-date'
import { createUniqueField } from './fields/unique-field'
import { getDatabaseObjectMetadata } from '@/decorators'
import { createPaginationField } from './fields/pagination-field'
import { createEntityTypeDefs } from './typedefs/entity-typedefs'
import { getEntityName } from './util'

interface EntitiesMap {
  [entityName: string]: Function
}

export interface TypeResolversMap {
  [fieldName: string]: GraphQLFieldResolver<any, any>
}

export interface ResolversMap {
  [typeName: string]: TypeResolversMap | GraphQLType
}

export interface SchemaBuilder {
  entitiesMap: EntitiesMap
  resolversMap: ResolversMap
  typeDefs: string
  meta: {
    [entityName: string]: {
      uniqueFieldName: {
        [sourceTypeName: string]: string[]
      }
      entityEnumColumnType: {
        [fieldName: string]: string
      }
      whereInputTypeName?: string
      orderByInputTypeName?: string
    }
  }
}

interface BuildSchemaOptions {
  entities?: Function[]
}

export function createSchemaBuilder(options: BuildSchemaOptions = {}): SchemaBuilder {
  let schemaBuilder: SchemaBuilder = {
    entitiesMap: {},
    resolversMap: {
      ID: GraphQLID,
      DateTime: GraphQLDateTime,
    },
    meta: {},
    typeDefs: `\nscalar DateTime\nscalar ID\n\n`,
  }

  const entities = options.entities || getDecoratedEntities()
  entities.forEach(entity => {
    const entityName = getEntityName(entity)
    schemaBuilder.entitiesMap[entityName] = entity

    schemaBuilder.meta[entityName] = {
      uniqueFieldName: {},
      entityEnumColumnType: {},
    }
  })
  entities.forEach(entity => {
    const {
      queryFieldsEnabled,
      queryUniqueField,
      typeDefsEnabled,
    }: GraphQLEntityMetadata = getDatabaseObjectMetadata(entity)

    if (queryFieldsEnabled === false) {
      return
    }

    if (typeDefsEnabled !== false) {
      schemaBuilder = createEntityTypeDefs(entity, schemaBuilder)
    }

    if (!queryUniqueField || queryUniqueField.enabled !== false) {
      schemaBuilder = createUniqueField(entity, schemaBuilder)
    }

    if (!queryUniqueField || queryUniqueField.enabled !== false) {
      schemaBuilder = createPaginationField(entity, schemaBuilder)
    }
  })

  schemaBuilder.typeDefs = String(
    mergeTypes([schemaBuilder.typeDefs], {
      all: true,
    }),
  )

  return schemaBuilder
}
