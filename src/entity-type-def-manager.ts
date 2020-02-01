import { GraphQLFieldResolver, GraphQLType } from 'graphql'
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata'
import { getConnection, EntityMetadata } from 'typeorm'
import { SchemaBuilder as NexusSchemaBuilder, inputObjectType, enumType } from 'nexus/dist/core'
import { typeORMColumnTypeToGraphQLType } from './type'
import { getDatabaseObjectMetadata } from './decorators'
import { namingStrategy } from './nexus/naming-strategy'
import { getEntityTypeName } from './util'
import { RelationMetadata } from 'typeorm/metadata/RelationMetadata'
import * as Nexus from 'nexus'

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

interface RequiredGetOrCreateTypeConfig {
  entity: Function
  nexusBuilder: NexusSchemaBuilder
}

interface BuildCreateOneInputTypeConfig extends RequiredGetOrCreateTypeConfig {
  kind: 'CreateOneInput'
}

export type GetOrCreateTypeConfig = BuildCreateOneInputTypeConfig

export class EntityTypeDefManager {
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

    return new EntityTypeDefManager(entitiesMap, entitiesMetadataMap)
  }

  private typesDictionary: string[]

  constructor(public entities: EntitiesMap, public entitiesMetadata: EntitiesMetadataMap) {
    this.typesDictionary = []
  }

  getEntity(name: string) {
    return this.entities[name]
  }

  entityColumnToTypeName(
    entity: Function,
    column: ColumnMetadata,
    nexusBuilder: NexusSchemaBuilder,
  ): Nexus.AllOutputTypes | Nexus.core.AllInputTypes {
    if (column.isPrimary) {
      return 'ID'
    }

    if (column.type === 'enum') {
      return this.useEnumTypeForColumn(entity, column, nexusBuilder)
    }

    const nativeTypeName = typeORMColumnTypeToGraphQLType(column.type)
    if (!nativeTypeName) {
      throw new Error(
        `Couldn't find a matching GraphQL Type to '${column.type}' at ${entity.name} Entity`,
      )
    }

    return nativeTypeName
  }

  useCreateOneInputType = (entity: Function, nexusBuilder: NexusSchemaBuilder) => {
    const entityTypeName = getEntityTypeName(entity)
    const typeName = namingStrategy.createInputType(entityTypeName) as Nexus.core.AllInputTypes

    if (this.typesDictionary.includes(typeName)) {
      return typeName
    }

    const entityMetadata = this.getEntityMetadata(entity)
    nexusBuilder.addType(
      inputObjectType({
        name: typeName,
        definition: t => {
          entityMetadata.columns.forEach(column => {
            if (column.isGenerated) {
              return
            }

            t.field(column.propertyName, {
              type: this.entityColumnToTypeName(
                entity,
                column,
                nexusBuilder,
              ) as Nexus.core.AllInputTypes,
              required: !column.isNullable && !column.isCreateDate && !column.isUpdateDate,
            })
          })

          entityMetadata.relations.forEach(relation => {
            if (relation.isManyToMany && !relation.junctionEntityMetadata) {
              throw new Error(
                `Missing @JoinTable together with @ManyToMany on "${relation.entityMetadata.name}"."${relation.propertyName}"`,
              )
            }

            t.field(relation.propertyName, {
              type: this.useCreateRelationInputType(entity, relation, nexusBuilder),
              required: false,
            })
          })
        },
      }),
    )

    this.typesDictionary.push(typeName)
    return typeName
  }

  useCreateRelationInputType(
    entity: Function,
    relation: RelationMetadata,
    nexusBuilder: NexusSchemaBuilder,
  ): Nexus.core.AllInputTypes {
    const isRelationAnArray = relation.isOneToMany || relation.isManyToMany
    const entityTypeName = getEntityTypeName(entity)
    const relatedEntity = this.entities[relation.inverseEntityMetadata.name]
    const typeName = namingStrategy[
      isRelationAnArray ? 'createManyRelationInputType' : 'createOneRelationInputType'
    ](entityTypeName, relation.propertyName) as Nexus.core.AllInputTypes

    if (this.typesDictionary.includes(typeName)) {
      return typeName
    }

    nexusBuilder.addType(
      inputObjectType({
        name: typeName,
        definition: t => {
          t.field('connect', {
            type: isRelationAnArray
              ? this.useWhereInputType(relatedEntity, nexusBuilder)
              : this.useWhereUniqueInputType(relatedEntity, nexusBuilder),
            required: false,
          })
          t.field('create', {
            type: this.useCreateOneWithoutRelationInputType(
              relatedEntity,
              relation.inverseRelation!,
              nexusBuilder,
            ),
            list: isRelationAnArray || undefined,
            required: false,
          })
        },
      }),
    )
    this.typesDictionary.push(typeName)
    return typeName
  }

  useCreateOneWithoutRelationInputType(
    entity: Function,
    excludedRelation: RelationMetadata,
    nexusBuilder: NexusSchemaBuilder,
  ): Nexus.core.AllInputTypes {
    const entityMetadata = this.getEntityMetadata(entity)
    const entityTypeName = getEntityTypeName(entity)
    const { propertyName: excludedPropertyName } = excludedRelation
    const typeName = namingStrategy.entityWithoutRelationInputType(
      entityTypeName,
      excludedPropertyName,
    ) as Nexus.core.AllInputTypes

    if (this.typesDictionary.includes(typeName)) {
      return typeName
    }

    const foreignKeys = excludedRelation.foreignKeys
    nexusBuilder.addType(
      inputObjectType({
        name: typeName,
        definition: t => {
          entityMetadata.columns.forEach(column => {
            if (column.isGenerated) {
              return
            }

            if (
              // Remove required foreign keys (e.g.: userId)
              foreignKeys.length &&
              column.propertyName === foreignKeys[0].columns[0].propertyName
            ) {
              return
            }

            t.field(column.propertyName, {
              type: this.entityColumnToTypeName(
                entity,
                column,
                nexusBuilder,
              ) as Nexus.core.AllInputTypes,
              required: !column.isNullable && !column.isCreateDate && !column.isUpdateDate,
            })
          })

          entityMetadata.relations.forEach(relation => {
            if (relation.propertyName === excludedPropertyName) {
              return
            }

            t.field(relation.propertyName, {
              type: this.useCreateRelationInputType(entity, relation, nexusBuilder),
              required: false,
            })
          })
        },
      }),
    )

    this.typesDictionary.push(typeName)
    return typeName
  }

  useUpdateInputType = (entity: Function, nexusBuilder: NexusSchemaBuilder) => {
    const entityTypeName = getEntityTypeName(entity)
    const typeName = namingStrategy.updateInputType(entityTypeName) as Nexus.core.AllInputTypes

    if (this.typesDictionary.includes(typeName)) {
      return typeName
    }

    const entityMetadata = this.getEntityMetadata(entity)
    nexusBuilder.addType(
      inputObjectType({
        name: typeName,
        definition: t => {
          entityMetadata.columns.forEach(column => {
            if (column.isGenerated) {
              return
            }

            t.field(column.propertyName, {
              type: this.entityColumnToTypeName(
                entity,
                column,
                nexusBuilder,
              ) as Nexus.core.AllInputTypes,
              required: false,
            })
          })
        },
      }),
    )

    this.typesDictionary.push(typeName)
    return typeName
  }

  useUpdateManyType(nexusBuilder: NexusSchemaBuilder): 'UpdateManyResult' {
    const typeName = 'UpdateManyResult'
    if (this.typesDictionary.includes(typeName)) {
      return typeName
    }

    nexusBuilder.addType(
      Nexus.objectType({
        name: typeName,
        definition: t => [t.int('affectedRows')],
      }),
    )
    this.typesDictionary.push(typeName)
    return typeName
  }

  useEnumTypeForColumn(
    entity: Function,
    column: ColumnMetadata,
    nexusBuilder: NexusSchemaBuilder,
  ): Nexus.AllOutputTypes {
    const entityTypeName = getEntityTypeName(entity)
    const typeName = namingStrategy.enumType(
      entityTypeName,
      column.propertyName,
    ) as Nexus.AllOutputTypes

    if (this.typesDictionary.includes(typeName)) {
      return typeName
    }

    nexusBuilder.addType(
      enumType({
        name: typeName as string,
        members: column.enum!.map(String)!,
      }),
    )

    this.typesDictionary.push(typeName)
    return typeName
  }

  useWhereInputType(entity: Function, nexusBuilder: NexusSchemaBuilder): Nexus.core.AllInputTypes {
    const entityTypeName = getEntityTypeName(entity)
    const typeName = namingStrategy.whereInputType(entityTypeName) as Nexus.core.AllInputTypes

    if (this.typesDictionary.includes(typeName)) {
      return typeName
    }

    const { columns: entityColumns } = getConnection().getMetadata(entity)

    nexusBuilder.addType(
      inputObjectType({
        name: typeName,
        definition: t => {
          t.field('AND', { type: typeName, list: true })
          t.field('OR', { type: typeName, list: true })
          t.field('NOT', { type: typeName, list: true })
          entityColumns.forEach(column => {
            if (column.relationMetadata && column.isVirtual) {
              return
            }

            const columnTypeName = this.entityColumnToTypeName(
              entity,
              column,
              nexusBuilder,
            ) as Nexus.core.AllInputTypes
            if (columnTypeName === 'String') {
              t.field(column.propertyName, {
                type: 'StringFilter',
              })
            } else if (columnTypeName === 'Int' || columnTypeName === 'Float') {
              t.field(column.propertyName, {
                type: 'IntFilter',
              })
            } else if (columnTypeName === 'ID') {
              t.field(column.propertyName, {
                type: 'IdFilter',
              })
            } else {
              t.field(column.propertyName, {
                type: columnTypeName,
              })
            }
          })
        },
      }),
    )

    this.typesDictionary.push(typeName)
    return typeName
  }

  useWhereUniqueInputType(
    entity: Function,
    nexusBuilder: NexusSchemaBuilder,
  ): Nexus.core.AllInputTypes {
    const entityTypeName = getEntityTypeName(entity)
    const typeName = namingStrategy.whereUniqueInputType(entityTypeName) as Nexus.core.AllInputTypes

    if (this.typesDictionary.includes(typeName)) {
      return typeName
    }

    const { columns: entityColumns, indices } = getConnection().getMetadata(entity)

    // find indices columns, and for now only allow inices that registers only one column
    const uniqueIndices = indices
      .filter(index => index.isUnique && index.columns.length === 1)
      .map(index => index.columns[0].propertyName)

    nexusBuilder.addType(
      inputObjectType({
        name: typeName,
        definition: t => {
          entityColumns.forEach(column => {
            if (column.relationMetadata && column.isVirtual) {
              return
            }

            const columnTypeName = this.entityColumnToTypeName(
              entity,
              column,
              nexusBuilder,
            ) as Nexus.core.AllInputTypes

            if (columnTypeName === 'ID') {
              t.field(column.propertyName, {
                type: columnTypeName,
              })
            } else if (uniqueIndices.includes(column.propertyName)) {
              t.field(column.propertyName, {
                type: columnTypeName,
              })
            }
          })
        },
      }),
    )

    this.typesDictionary.push(typeName)
    return typeName
  }

  useOrderByInputType(
    entity: Function,
    nexusBuilder: NexusSchemaBuilder,
  ): Nexus.core.AllInputTypes {
    const entityTypeName = getEntityTypeName(entity)
    const typeName = namingStrategy.orderByInputType(entityTypeName) as Nexus.core.AllInputTypes

    if (this.typesDictionary.includes(typeName)) {
      return typeName
    }

    const { columns: entityColumns } = getConnection().getMetadata(entity)

    nexusBuilder.addType(
      inputObjectType({
        name: typeName,
        definition: t => {
          entityColumns.map(column => t.field(column.propertyName, { type: 'OrderByArgument' }))
        },
      }),
    )

    this.typesDictionary.push(typeName)
    return typeName
  }

  getEntityDataTupleByTypeName(typeName: string): [Function, EntityMetadata] {
    const matchedEntityName = Object.keys(this.entities).find(
      entityName => getDatabaseObjectMetadata(this.entities[entityName]).typeName === typeName,
    )

    const entity = matchedEntityName && this.entities[matchedEntityName]

    if (!entity) {
      throw new Error(`Unable to find entity by type name '${typeName}'`)
    }

    return [entity, this.entitiesMetadata[entity.name]]
  }

  getEntityMetadata(entity: Function) {
    return this.entitiesMetadata[entity.name]
  }
}
