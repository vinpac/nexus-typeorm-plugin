import { EntityTypeDefManager } from '../entity-type-def-manager'
import { dynamicOutputMethod } from 'nexus'

// declare global {
//   export interface NexusGenCustomOutputMethods<TypeName extends string> {
//     entityFields: EntityFieldsOutputMethod<string[]>
//   }
// }

export interface EntityFieldsOutputMethod<TFieldNames extends string[]> {
  (config?: TFieldNames | EntityFieldsOutputMethodConfig<TFieldNames>): void
}

export interface EntityFieldsOutputMethodConfig<TFieldNames extends string[]> {
  allBut: TFieldNames
}

function argsToFieldNames(args: any[], manager: EntityTypeDefManager, typeName: string): string[] {
  if (Array.isArray(args[0])) {
    return args[0]
  }

  const [, entityMetadata] = manager.getEntityDataTupleByTypeName(typeName)
  const allFieldNames = [
    ...entityMetadata.columns.map(column => column.propertyName),
    ...entityMetadata.relations.map(relation => relation.propertyName),
  ]

  if (typeof args[0] === 'object') {
    return allFieldNames.filter(fieldName => !args[0].allBut.includes(fieldName))
  }

  return allFieldNames
}

export function buildEntityFieldsOutputMethod(manager: EntityTypeDefManager) {
  return dynamicOutputMethod({
    name: 'entityFields',
    factory({ typeDef: t, typeName, args }) {
      const fieldNames = argsToFieldNames(args, manager, typeName)

      fieldNames.forEach(fieldName => {
        ;(t.entity as any)[fieldName]()
      })
    },
  })
}
