import { dynamicOutputProperty } from 'nexus'
import { EntityTypeDefManager } from '../entity-type-def-manager'
import { EntityOutputMethodConfig } from './entity-field-output-method'

export interface EntityFieldPublisher<TEntity> {
  (config?: EntityOutputMethodConfig<TEntity>): void
}

export type EntityOutputProperty<TEntity, TFieldName extends string> = {
  [key in TFieldName]: EntityFieldPublisher<TEntity>
}

export function buildEntityOutputProperty(manager: EntityTypeDefManager) {
  return dynamicOutputProperty({
    name: 'entity',
    typeDefinition: ': NexusTypeORMEntityProperty<TypeName>',
    factory: factoryConfig => {
      const { typeName, typeDef: t } = factoryConfig
      const [, entityMetadata] = manager.getEntityDataTupleByTypeName(typeName)
      const entityOutputProperty: EntityOutputProperty<any, string> = {}
      entityMetadata.columns.forEach(column => {
        entityOutputProperty[column.propertyName] = config => {
          t.entityField(column.propertyName, config)
        }
      })

      entityMetadata.relations.forEach(relation => {
        entityOutputProperty[relation.propertyName] = config => {
          t.entityField(relation.propertyName, config)
        }
      })

      return entityOutputProperty
    },
  })
}
