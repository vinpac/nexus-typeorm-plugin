import { EntityTypeDefManager } from '../entity-type-def-manager'
import { CRUDFieldConfigResolveFn } from './crud-field-output-method'
import * as Nexus from 'nexus'
import { namingStrategy } from './naming-strategy'
import { dynamicOutputProperty } from 'nexus'
import { getEntityTypeName } from '../util'
import { FindOneFieldNextFnExtraContext, FindOneFieldPublisherConfig } from './crud/find-one-field'
import { ArgsRecord } from 'nexus/dist/core'
import { MapArgsFn } from '../args'
import { FindManyFieldPublisherConfig } from './crud/find-many-field'
import { CreateOneFieldPublisherConfig } from './crud/create-one-field'
import {
  UpdateOneFieldPublisherConfig,
  UpdateManyFieldPublisherConfig,
} from './crud/update-one-field'

export interface CRUDPropertyFieldPublisherConfig<TType> {
  type?: Nexus.AllOutputTypes
  alias?: string
  args?: ArgsRecord | MapArgsFn
  resolve?: CRUDFieldConfigResolveFn<TType, FindOneFieldNextFnExtraContext>
}

export interface CRUDPropertyFindOneFieldPublisher<TEntity> {
  (fieldName?: string, config?: FindOneFieldPublisherConfig<TEntity>): void
}
export interface CRUDPropertyFindManyFieldPublisher<TEntity> {
  (fieldName?: string, config?: FindManyFieldPublisherConfig<TEntity>): void
}
export interface CRUDPropertyCreateOneFieldPublisher<TEntity> {
  (fieldName?: string, config?: CreateOneFieldPublisherConfig<TEntity>): void
}

export interface CRUDPropertyUpdateOneFieldPublisher<TEntity> {
  (fieldName?: string, config?: UpdateOneFieldPublisherConfig<TEntity>): void
}

export interface CRUDPropertyUpdateManyFieldPublisher<TEntity> {
  (fieldName?: string, config?: UpdateManyFieldPublisherConfig<TEntity>): void
}

type CRUDOutputPropertyAnyMethod = CRUDPropertyFindOneFieldPublisher<any>
export interface CRUDOutputProperty {
  [key: string]: CRUDOutputPropertyAnyMethod
}

export function buildCRUDOutputProperty(manager: EntityTypeDefManager) {
  return dynamicOutputProperty({
    name: 'crud',
    typeDefinition: `: NexusTypeORMCRUDProperty<TypeName>`,
    factory: factoryConfig => {
      const { typeDef: t } = factoryConfig
      const entitiesStrategy = Object.keys(manager.entities).map(key =>
        getEntityTypeName(manager.entities[key]),
      )
      const crudOutputProperty: CRUDOutputProperty = {}

      entitiesStrategy.forEach(entityTypeName => {
        const findOneFieldName = namingStrategy.findOneField(entityTypeName)
        crudOutputProperty[findOneFieldName] = (fieldName = findOneFieldName, config) => {
          ;(t as any).crudField(fieldName, {
            method: 'findOne',
            type: entityTypeName,
            ...config,
            entity: entityTypeName,
          })

          return crudOutputProperty
        }

        const findManyFieldName = namingStrategy.findManyField(entityTypeName)
        crudOutputProperty[findManyFieldName] = (fieldName = findManyFieldName, config) => {
          ;(t as any).crudField(fieldName, {
            method: 'findMany',
            type: entityTypeName,
            ...config,
            entity: entityTypeName,
          })

          return crudOutputProperty
        }

        const createOneFieldName = namingStrategy.createOneFieldName(entityTypeName)
        crudOutputProperty[createOneFieldName] = (fieldName = createOneFieldName, config) => {
          ;(t as any).crudField(fieldName, {
            method: 'createOne',
            type: entityTypeName,
            ...config,
            entity: entityTypeName,
          })

          return crudOutputProperty
        }

        const updateOneFieldName = namingStrategy.updateOneFieldName(entityTypeName)
        crudOutputProperty[updateOneFieldName] = (fieldName = updateOneFieldName, config) => {
          ;(t as any).crudField(fieldName, {
            method: 'updateOne',
            ...config,
            entity: entityTypeName,
          })

          return crudOutputProperty
        }

        const updateManyFieldName = namingStrategy.updateManyFieldName(entityTypeName)
        crudOutputProperty[updateManyFieldName] = (fieldName = updateManyFieldName, config) => {
          ;(t as any).crudField(fieldName, {
            method: 'updateMany',
            ...config,
            entity: entityTypeName,
          })

          return crudOutputProperty
        }
      })

      return crudOutputProperty
    },
  })
}
