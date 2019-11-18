import { dynamicOutputProperty } from 'nexus'
import { SchemaBuilder } from '../schema-builder'
import { EntityOutputMethodConfig } from './entity-field-output-method'

declare global {
  export interface NexusGenCustomOutputProperties<TypeName extends string> {
    entity: EntityOutputProperty<string>
  }
}

export interface FieldPublisher<TFieldName extends string> {
  (config?: EntityOutputMethodConfig<any>): EntityOutputProperty<TFieldName>
}

export type EntityOutputProperty<TFieldName extends string> = {
  [key in TFieldName]: FieldPublisher<TFieldName>
}

export function buildEntityOutputProperty(schemaBuilder: SchemaBuilder) {
  return dynamicOutputProperty({
    name: 'entity',
    factory: factoryConfig => {
      const { typeName, typeDef: t } = factoryConfig
      const [, entityMetadata] = schemaBuilder.getEntityDataTupleByTypeName(typeName)
      const entityOutputProperty: EntityOutputProperty<string> = {}
      entityMetadata.columns.forEach(column => {
        entityOutputProperty[column.propertyName] = config => {
          t.entityField(column.propertyName, config)
          return entityOutputProperty
        }
      })

      entityMetadata.relations.forEach(relation => {
        entityOutputProperty[relation.propertyName] = config => {
          t.entityField(relation.propertyName, config)
          return entityOutputProperty
        }
      })

      return entityOutputProperty
    },
  })
}
