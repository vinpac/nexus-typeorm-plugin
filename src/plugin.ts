import { getDecoratedEntities } from './decorators'
import { EntityTypeDefManager } from './entity-type-def-manager'
import { GraphQLDateTime } from 'graphql-iso-date'
import { DynamicOutputMethodDef } from 'nexus/dist/core'
import { GraphQLScalarType } from 'graphql'
import { DynamicOutputPropertyDef } from 'nexus/dist/dynamicProperty'
import { buildEntityOutputProperty } from './nexus/entity-output-property'
import { buildEntityFieldsOutputMethod } from './nexus/entity-fields-output-method'
import { buildEntityFieldOutputMethod } from './nexus/entity-field-output-method'
import { buildCRUDOutputProperty } from './nexus/crud-output-property'
import { buildCRUDOutputMethod } from './nexus/crud-field-output-method'
import { writeTypeGen } from './typegen'
import {
  singleOperandOperations,
  numberOperandOperations,
  multipleOperandOperations,
} from './args/arg-where'

import { inputObjectType } from 'nexus/dist/core'

export interface NexusTypeORMPluginConfig {
  outputs:
    | {
        typegen: string
        format?: (text: string) => string
      }
    | false
}

export function nexusTypeORMPlugin(
  config: NexusTypeORMPluginConfig,
): Array<
  | DynamicOutputPropertyDef<any>
  | DynamicOutputMethodDef<any>
  | DynamicOutputMethodDef<any>
  | GraphQLScalarType
> {
  const manager = EntityTypeDefManager.fromEntitiesList(getDecoratedEntities())
  if (config.outputs) {
    writeTypeGen(config.outputs.typegen, manager, config.outputs.format)
  }

  const StringFilterInput = inputObjectType({
    name: 'StringFilterInput',
    definition(t) {
      t.string('equals')
      singleOperandOperations.map(operator => t.string(operator))
      multipleOperandOperations.map(operator => t.list.string(operator))
    },
  })

  const IntFilterInput = inputObjectType({
    name: 'IntFilterInput',
    definition(t) {
      t.int('equals')
      numberOperandOperations.map(operator => t.int(operator))
      multipleOperandOperations.map(operator => t.list.int(operator))
    },
  })

  return [
    buildEntityFieldOutputMethod(manager),
    buildCRUDOutputMethod(manager),
    buildEntityOutputProperty(manager),
    buildEntityFieldsOutputMethod(manager),
    buildCRUDOutputProperty(manager),
    GraphQLDateTime,

    IntFilterInput,
    StringFilterInput,
  ]
}
