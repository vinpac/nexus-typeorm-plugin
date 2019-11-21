import { EntityTypeDefManager } from '../entity-type-def-manager'
import { CRUDFieldConfigResolveFn } from './crud-output-method'
import * as Nexus from 'nexus'
import { namingStrategy } from './naming-strategy'
import { dynamicOutputProperty } from 'nexus'
import { getEntityTypeName } from '../util'
import { FindOneFieldNextFnExtraContext, CRUDFindOneMethod } from './crud/find-one-field'
import { ArgsRecord } from 'nexus/dist/core'
import { MapArgsFn } from '../args'

export interface CRUDPropertyFieldConfig<TType> {
  type?: Nexus.AllOutputTypes
  alias?: string
  args?: ArgsRecord | MapArgsFn
  resolve?: CRUDFieldConfigResolveFn<TType, FindOneFieldNextFnExtraContext>
}

type CRUDOutputPropertyMethod = CRUDFindOneMethod<any>
export interface CRUDOutputProperty {
  [key: string]: CRUDOutputPropertyMethod
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
      })

      return crudOutputProperty
    },
  })
}
