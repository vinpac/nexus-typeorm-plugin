import { SchemaBuilder } from '../schema-builder'
import { dynamicOutputMethod } from 'nexus'

declare global {
  export interface NexusGenCustomOutputMethods<TypeName extends string> {
    entityFields: EntityFieldsOutputMethod<string[]>
  }
}

export interface EntityFieldsOutputMethod<TFieldNames extends string[]> {
  (config?: TFieldNames | EntityFieldsOutputMethodConfig<TFieldNames>): void
}

export interface EntityFieldsOutputMethodConfig<TFieldNames extends string[]> {
  allBut: TFieldNames
}

function argsToFieldNames(args: any[], schemaBuilder: SchemaBuilder, typeName: string): string[] {
  if (Array.isArray(args[0])) {
    return args[0]
  }

  const [, entityMetadata] = schemaBuilder.getEntityDataTupleByTypeName(typeName)
  const allFieldNames = [
    ...entityMetadata.columns.map(column => column.propertyName),
    ...entityMetadata.relations.map(relation => relation.propertyName),
  ]

  if (typeof args[0] === 'object') {
    return allFieldNames.filter(fieldName => !args[0].allBut.includes(fieldName))
  }

  return allFieldNames
}

export function buildEntityFieldsOutputMethod(schemaBuilder: SchemaBuilder) {
  return dynamicOutputMethod({
    name: 'entityFields',
    factory({ typeDef: t, typeName, args }) {
      const fieldNames = argsToFieldNames(args, schemaBuilder, typeName)

      fieldNames.forEach(fieldName => {
        t.entity[fieldName]()
      })
    },
  })
}
