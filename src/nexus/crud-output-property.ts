import { SchemaBuilder } from '../schema-builder'
import * as Nexus from 'nexus'
import {
  fieldNamingStrategy,
  CRUDFieldFindOneOutputMethodConfig,
  CRUDFieldFindManyOutputMethodConfig,
} from './crud-output-method'
import { dynamicOutputProperty } from 'nexus'
import { getEntityTypeName } from '../util'
import { ArgsRecord } from 'nexus/dist/core'
import { MapArgsFn } from '../args'

declare global {
  export interface NexusGenCustomOutputProperties<TypeName extends string> {
    crud: CRUDOutputProperty
  }
}

export interface CRUDPropertyFieldConfig<TType> {
  alias?: string
  args?: ArgsRecord | MapArgsFn
  type?: Nexus.AllInputTypes
  resolve?:
    | CRUDFieldFindOneOutputMethodConfig<TType>['resolve']
    | CRUDFieldFindManyOutputMethodConfig<TType>['resolve']
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
        const findOneFieldName = fieldNamingStrategy.findOne('', entityTypeName)
        crudOutputProperty[findOneFieldName] = (fieldName = findOneFieldName, config) => {
          t.crudField(fieldName, {
            method: 'findOne',
            type: entityTypeName,
            ...config,
            entity: entityTypeName,
          })

          return crudOutputProperty
        }

        const findManyFieldName = fieldNamingStrategy.findMany('', entityTypeName)
        crudOutputProperty[findManyFieldName] = (fieldName = findManyFieldName, config) => {
          t.crudField(fieldName, {
            method: 'findMany',
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
