import { getConnection } from 'typeorm'
import { getDatabaseObjectMetadata } from './decorators'
import { EntitiesMap, SchemaBuilder } from './schema-builder'
import { GraphQLResolveInfo, SelectionSetNode, ArgumentNode, ValueNode } from 'graphql'
import { EntityJoin } from './query-builder'
import { RelationMetadata } from 'typeorm/metadata/RelationMetadata'

export function makeFirstLetterUpperCase(s: string): string {
  return typeof s === 'string' && s.length ? s[0].toUpperCase() + s.substr(1) : s
}

export function makeFirstLetterLowerCase(s: string): string {
  return typeof s === 'string' && s.length ? s[0].toLowerCase() + s.substr(1) : s
}

export const gql = (templateStringArray: TemplateStringsArray) => {
  return templateStringArray[0]
}

export const getEntityTypeName = (entity: Function) => getDatabaseObjectMetadata(entity).typeName

export const getEntityPrimaryColumn = (entity: Function) => {
  const primaryColumn = getConnection().getMetadata(entity).primaryColumns[0]

  if (!primaryColumn) {
    throw new Error(`Entity ${entity.name} is missing a primary column`)
  }

  return primaryColumn
}

export const findEntityByTypeName = (
  typeName: string,
  entitiesMap: EntitiesMap,
): Function | null => {
  const matchedEntityName = Object.keys(entitiesMap).find(
    entityName => getDatabaseObjectMetadata(entitiesMap[entityName]).typeName === typeName,
  )

  return matchedEntityName ? entitiesMap[matchedEntityName] : null
}

const parseGraphQLValue = (value: ValueNode, variableValues: any): any => {
  if (value.kind === 'ObjectValue') {
    const obj: any = {}
    value.fields.forEach(field => {
      obj[field.name.value] = parseGraphQLValue(field.value, variableValues)
    })
    return obj
  }

  if (value.kind === 'Variable') {
    return variableValues[value.name.value]
  }

  if (value.kind === 'ListValue') {
    return value.values.map(itemvalue => parseGraphQLValue(itemvalue, variableValues))
  }

  if (value.kind === 'NullValue') {
    return null
  }

  if (value.kind === 'IntValue') {
    return parseInt(value.value, 10)
  }

  if (value.kind === 'FloatValue') {
    return parseFloat(value.value)
  }

  return value.value
}

export const graphQLArgumentsToObject = (
  args: readonly ArgumentNode[],
  variableValues: any,
): { [argName: string]: any } => {
  const obj: any = {}
  args.forEach(arg => {
    obj[arg.name.value] = parseGraphQLValue(arg.value, variableValues)
  })
  return obj
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
              return
            }

            joins.push({ propertyPath, relation })

            // const args = selection.arguments
            //   ? graphQLArgumentsToObject(selection.arguments, info.variableValues)
            //   : {}
            // joins.push({
            //   ...args,
            //   relation,
            //   where:
            //     args.where &&
            //     args.where &&
            //     translateWhereClause(relation.entityMetadata.tableName, args.where),
            //   propertyPath,
            // })
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
