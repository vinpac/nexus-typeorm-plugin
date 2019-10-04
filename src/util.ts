import { FieldNode, ValueNode } from 'graphql'
import { getConnection } from 'typeorm'
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata'
import { getDatabaseObjectMetadata } from './decorators'
import { EntitiesMap } from './schema-builder'

export interface Relation {
  relationPath: string
  fieldNode: FieldNode
  type: string | Function
}

export function graphQLObjectValueToObject(value: ValueNode) {
  if (
    value.kind === 'StringValue' ||
    value.kind === 'IntValue' ||
    value.kind === 'BooleanValue' ||
    value.kind === 'FloatValue' ||
    value.kind === 'EnumValue'
  ) {
    return value.value
  } else if (value.kind === 'NullValue') {
    return null
  } else if (value.kind === 'ObjectValue') {
    return value.fields.reduce<{ [key: string]: any }>((values, field) => {
      values[field.name.value] = graphQLObjectValueToObject(field.value)
      return values
    }, {})
  } else if (value.kind === 'ListValue') {
    return value.values.reduce<any[]>((values, field) => {
      values.push(graphQLObjectValueToObject(field))
      return values
    }, [])
  }
}

export function orderItemsByPrimaryColumns<T>(
  primaryColumns: ColumnMetadata[],
  items: T[],
  ids: any[],
): T[] {
  const [primaryColumn] = primaryColumns

  if (primaryColumn) {
    const { propertyName } = primaryColumn

    const idToItemMap = items.reduce<any>((map, item) => {
      if (propertyName in item) {
        const id = (item as any)[propertyName]
        map[id] = item
      }
      return map
    }, {})

    const ordered = ids.reduce<T[]>((array, id) => {
      if (id in idToItemMap) {
        array.push(idToItemMap[id])
      }
      return array
    }, [])

    return ordered
  }

  return items
}

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
