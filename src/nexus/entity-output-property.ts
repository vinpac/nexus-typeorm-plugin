import { dynamicOutputProperty } from 'nexus'
import { EntityTypeDefManager } from '../entity-type-def-manager'
import {
  EntityOutputMethodConfig,
  EntityColumnFieldPublisherConfig,
  EntityFindOneFieldPublisherConfig,
} from './entity-field-output-method'

export interface EntityPropertyAnyFieldPublisher<TEntity> {
  (config?: EntityOutputMethodConfig<TEntity>): void
}

export type EntityOutputProperty<TEntity, TFieldName extends string> = {
  [key in TFieldName]: EntityPropertyAnyFieldPublisher<TEntity>
}

export interface EntityPropertyColumnDefFieldPublisher<TEntity> {
  (config?: EntityColumnFieldPublisherConfig<TEntity, any>): void
}
export interface EntityPropertyFindOneFieldPublisher<TEntity> {
  (config?: EntityFindOneFieldPublisherConfig<TEntity>): void
}
export interface EntityPropertyFindManyFieldPublisher<TEntity> {
  (config?: EntityFindOneFieldPublisherConfig<TEntity>): void
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
          ;(t as any).entityField(column.propertyName, config)
        }
      })

      entityMetadata.relations.forEach(relation => {
        entityOutputProperty[relation.propertyName] = config => {
          ;(t as any).entityField(relation.propertyName, config)
        }
      })

      return entityOutputProperty
    },
  })
}
