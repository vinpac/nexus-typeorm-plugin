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

  return [
    buildEntityFieldOutputMethod(manager),
    buildCRUDOutputMethod(manager),
    buildEntityOutputProperty(manager),
    buildEntityFieldsOutputMethod(manager),
    buildCRUDOutputProperty(manager),
    GraphQLDateTime,
  ]
}
