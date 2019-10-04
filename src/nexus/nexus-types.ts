import { objectType } from 'nexus'
import { NexusObjectTypeConfig } from 'nexus/dist/core'
import { ObjectDefinitionBlock } from 'nexus/dist/definitions/objectType'
import { EntityFieldConfig, EntityFieldsOptions } from './entity-field-output-method'
import { getDatabaseObjectMetadata } from '../decorators'

interface EntityObjectDefinitionBlock<TEntity, TTypeName extends string>
  extends Omit<ObjectDefinitionBlock<TTypeName>, 'entityField' | 'entityFields'> {
  entityField(fieldName: Extract<keyof TEntity, string>, config?: EntityFieldConfig): void
  entityFields(
    fields: Extract<keyof TEntity, string>[] | '*',
    options?: Omit<EntityFieldsOptions, 'ignore'> & { ignore?: Extract<keyof TEntity, string>[] },
  ): void
}

interface EntityObjectTypeConfig<TEntity, TTypeName extends string>
  extends Omit<NexusObjectTypeConfig<TTypeName>, 'definition'> {
  definition(t: EntityObjectDefinitionBlock<TEntity, TTypeName>): void
}

export function entityType<TEntity>(
  entity: new (...args: any[]) => TEntity,
  config?: Omit<EntityObjectTypeConfig<TEntity, any>, 'name'>,
) {
  const metadata = getDatabaseObjectMetadata(entity)
  return objectType<any>(
    config
      ? { ...config, name: metadata.typeName }
      : {
          name: metadata.typeName,
          definition: t => t.entityFields('*'),
        },
  )
}
