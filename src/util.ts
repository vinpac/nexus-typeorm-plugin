import { getConnection } from 'typeorm'
import { getDatabaseObjectMetadata } from './decorators'
import { SchemaBuilder } from './schema-builder'
import { GraphQLResolveInfo, SelectionSetNode } from 'graphql'
import { EntityJoin } from './query-builder'
import { RelationMetadata } from 'typeorm/metadata/RelationMetadata'

export function makeFirstLetterUpperCase(s: string): string {
  return typeof s === 'string' && s.length ? s[0].toUpperCase() + s.substr(1) : s
}

export const getEntityTypeName = (entity: Function) => getDatabaseObjectMetadata(entity).typeName

export const getEntityPrimaryColumn = (entity: Function) => {
  const primaryColumn = getConnection().getMetadata(entity).primaryColumns[0]

  if (!primaryColumn) {
    throw new Error(`Entity ${entity.name} is missing a primary column`)
  }

  return primaryColumn
}

export const grapQLInfoToEntityJoins = (
  info: GraphQLResolveInfo,
  entity: any,
  schemaBuilder: SchemaBuilder,
): EntityJoin[] => {
  const joins: EntityJoin[] = []
  const iterate = ({ selectionSet }: { selectionSet?: SelectionSetNode }, prefix = '') => {
    if (selectionSet) {
      selectionSet.selections.forEach(selection => {
        if (selection.kind === 'Field') {
          const propertyPath = `${prefix}${selection.name.value}`

          const relation = getDeepEntityRelation(entity, propertyPath, schemaBuilder)
          if (relation) {
            if (selection.arguments && selection.arguments.length) {
              // If the selection has arguments we can't join anymore
              // Example.: {
              //   user {
              //     posts (first: 10) {
              //      ...
              //     }
              //   }
              // }
              return
            }

            joins.push({ type: 'left', propertyPath })
          }

          iterate(selection, `${propertyPath}.`)
        }
      })
    }
  }
  iterate(info.fieldNodes[0])

  return joins
}

export const getDeepEntityRelation = (
  entity: any,
  relationPath: string,
  schemaBuilder: SchemaBuilder,
) => {
  let parentEntity = entity
  let relation: RelationMetadata | undefined
  relationPath.split('.').some(propertyName => {
    const metadata = schemaBuilder.entitiesMetadata[parentEntity.name]

    relation = metadata.findRelationWithPropertyPath(propertyName)
    if (!relation) {
      return true
    }

    parentEntity = schemaBuilder.entitiesMetadata[relation.inverseEntityMetadata.name]
    return false
  })

  return relation
}
