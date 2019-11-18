import { objectType } from 'nexus'
import { NexusObjectTypeConfig } from 'nexus/dist/core'
import { ObjectDefinitionBlock } from 'nexus/dist/definitions/objectType'
import { getDatabaseObjectMetadata } from '../decorators'
import { EntityOutputProperty } from './entity-output-property'
import { EntityFieldsOutputMethod } from './entity-fields-output-method'

interface EntityObjectDefinitionBlock<TEntity, TTypeName extends string>
  extends Omit<ObjectDefinitionBlock<TTypeName>, 'entity' | 'entityFields'> {
  entity: EntityOutputProperty<Extract<keyof TEntity, string>>
  entityFields: EntityFieldsOutputMethod<Extract<keyof TEntity, string>[]>
}

interface EntityObjectTypeConfig<TEntity, TTypeName extends string>
  extends Omit<NexusObjectTypeConfig<TTypeName>, 'definition' | 'name'> {
  definition(t: EntityObjectDefinitionBlock<TEntity, TTypeName>): void
}

export function entityType<TEntity>(
  entity: new (...args: any[]) => TEntity,
  config?: EntityObjectTypeConfig<TEntity, any>,
) {
  const metadata = getDatabaseObjectMetadata(entity)
  return objectType<any>(
    config
      ? { ...config, name: metadata.typeName }
      : {
          name: metadata.typeName,
          definition: t => t.entityFields(),
        },
  )
}
