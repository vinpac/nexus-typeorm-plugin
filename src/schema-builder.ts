import { GraphQLFieldResolver, GraphQLType } from 'graphql'
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata'
import { getConnection, EntityMetadata } from 'typeorm'
import { SchemaBuilder as NexusSchemaBuilder } from 'nexus/dist/core'
import { enumColumnToGraphQLObject } from './type'
import { createWhereInputObjectType } from './args/arg-where'
import { createOrderByInputObjectType } from './args/arg-order-by'

export interface EntitiesMap {
  [entityName: string]: Function
}

export interface EntitiesMetadataMap {
  [entityName: string]: EntityMetadata
}

export interface TypeResolversMap {
  [fieldName: string]: GraphQLFieldResolver<any, any>
}

export interface ResolversMap {
  [typeName: string]: TypeResolversMap | GraphQLType
}

interface ArgWhereTypeDefConfig {
  type: 'whereInput'
  entity: Function
}

interface ArgOrderByTypeDefConfig {
  type: 'orderByInput'
  entity: Function
}

interface EnumTypeDefConfig {
  type: 'enum'
  entity: Function
  column: ColumnMetadata
}

type TypeDefRecordConfig = ArgWhereTypeDefConfig | ArgOrderByTypeDefConfig | EnumTypeDefConfig

interface EntityTypesDictionary {
  enum: { [entityName: string]: { [propertyName: string]: string } }
  whereInput: { [entityName: string]: string }
  orderByInput: { [entityName: string]: string }
}

export class SchemaBuilder {
  /**
   * Create a new SchemaBuilder instance from an Entity array
   */
  static fromEntitiesList(entities: any[]) {
    const entitiesMap: EntitiesMap = {}
    const entitiesMetadataMap: EntitiesMetadataMap = {}
    const connection = getConnection()

    entities.forEach(entity => {
      entitiesMap[entity.name] = entity
      entitiesMetadataMap[entity.name] = connection.getMetadata(entity)
    })

    return new SchemaBuilder(entitiesMap, entitiesMetadataMap)
  }

  private typesDictionary: EntityTypesDictionary
  public entities: EntitiesMap
  public entitiesMetadata: EntitiesMetadataMap

  constructor(entities: EntitiesMap, entitiesMetadata: EntitiesMetadataMap) {
    this.entities = entities
    this.entitiesMetadata = entitiesMetadata
    this.typesDictionary = {
      enum: {},
      whereInput: {},
      orderByInput: {},
    }
  }

  public useType(nexusBuilder: NexusSchemaBuilder, req: TypeDefRecordConfig): string {
    const entityName = req.entity.name

    if (req.type === 'enum') {
      if (
        !this.typesDictionary.enum[entityName] ||
        !this.typesDictionary.enum[entityName][req.column.propertyName]
      ) {
        const enumObject = enumColumnToGraphQLObject(req.entity, req.column)
        nexusBuilder.addType(enumObject)
        this.typesDictionary.enum[entityName] = {
          ...this.typesDictionary.enum[entityName],
          [req.column.propertyName]: enumObject.name,
        }
      }

      return this.typesDictionary.enum[entityName][req.column.propertyName]
    }

    if (req.type === 'whereInput') {
      if (!this.typesDictionary.whereInput[entityName]) {
        this.typesDictionary.whereInput[entityName] = createWhereInputObjectType(
          req.entity,
          nexusBuilder,
          this,
        )
      }

      return this.typesDictionary.whereInput[entityName]
    }

    if (req.type === 'orderByInput') {
      if (!this.typesDictionary.orderByInput[entityName]) {
        this.typesDictionary.orderByInput[entityName] = createOrderByInputObjectType(
          req.entity,
          nexusBuilder,
        )
      }

      return this.typesDictionary.orderByInput[entityName]
    }

    throw new Error('Invalid request to useType')
  }
}
