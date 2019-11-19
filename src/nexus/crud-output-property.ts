import { SchemaBuilder } from '../schema-builder'
import { CRUDFieldConfigResolveFn } from './crud-output-method'
import * as Nexus from 'nexus'
import { namingStrategy } from './naming-strategy'
import { dynamicOutputProperty } from 'nexus'
import { getEntityTypeName } from '../util'
import { FindOneFieldNextFnExtraContext } from './crud/find-one-field'
import { ArgsRecord } from 'nexus/dist/core'
import { MapArgsFn } from '../args'

declare global {
  export interface NexusGenCustomOutputProperties<TypeName extends string> {
    crud: CRUDOutputProperty
  }
}

export interface CRUDPropertyFieldConfig<TType> {
  type?: Nexus.AllOutputTypes
  alias?: string
  args?: ArgsRecord | MapArgsFn
  resolve?: CRUDFieldConfigResolveFn<TType, FindOneFieldNextFnExtraContext>
}

export interface CRUDOutputProperty {
  [key: string]: (fieldName?: string, config?: CRUDPropertyFieldConfig<any>) => CRUDOutputProperty
}

export function buildCRUDOutputProperty(schemaBuilder: SchemaBuilder) {
  return dynamicOutputProperty({
    name: 'crud',
    factory: factoryConfig => {
      const { typeDef: t } = factoryConfig
      const entitiesStrategy = Object.keys(schemaBuilder.entities).map(key =>
        getEntityTypeName(schemaBuilder.entities[key]),
      )
      const crudOutputProperty: CRUDOutputProperty = {}

      entitiesStrategy.forEach(entityTypeName => {
        const findOneFieldName = namingStrategy.findOneField(entityTypeName)
        crudOutputProperty[findOneFieldName] = (fieldName = findOneFieldName, config) => {
          t.crudField(fieldName, {
            method: 'findOne',
            type: entityTypeName,
            ...config,
            entity: entityTypeName,
          })

          return crudOutputProperty
        }

        const findManyFieldName = namingStrategy.findManyField(entityTypeName)
        crudOutputProperty[findManyFieldName] = (fieldName = findManyFieldName, config) => {
          t.crudField(fieldName, {
            method: 'findMany',
            type: entityTypeName,
            ...config,
            entity: entityTypeName,
          })

          return crudOutputProperty
        }

        const createOneFieldName = namingStrategy.createOneFieldName(entityTypeName)
        crudOutputProperty[createOneFieldName] = (fieldName = createOneFieldName, config) => {
          t.crudField(fieldName, {
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
