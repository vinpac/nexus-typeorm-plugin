import { GraphQLResolveInfo, NameNode, SelectionNode, FieldNode, ValueNode } from 'graphql'
import { getConnection } from 'typeorm'
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata'

export interface Relation {
  relationPath: string
  fieldNode: FieldNode
  type: string | Function
}

function _getRelationsForFieldNode<T>(
  rootType: new () => T,
  fieldNode: FieldNode,
): Relation[] {
  const { selectionSet } = fieldNode
  const results: Relation[] = []

  if (selectionSet) {
    const conn = getConnection()
    const meta = conn.getMetadata(rootType)

    const { relations } = meta

    selectionSet.selections.forEach((selection: SelectionNode) => {
      if ('name' in selection) {
        const name: NameNode = selection.name
        const targetRelation = relations.find(relation =>
          relation.propertyPath === name.value
        )

        if (targetRelation) {
          if (selection.kind === 'Field') {
            results.push({
              relationPath: targetRelation.propertyPath,
              fieldNode: selection,
              type: targetRelation.type,
            })

            if ('selectionSet' in selection && selection.selectionSet) {
              const subselections = _getRelationsForFieldNode(
                targetRelation.type as any,
                selection,
              )

              subselections.forEach(
                subselection => results.push({
                  relationPath: `${targetRelation.propertyPath}.${subselection.relationPath}`,
                  fieldNode: subselection.fieldNode,
                  type: subselection.type,
                }),
              )
            }
          }
        }
      }
    })
  }

  return results
}

export function getRelationsForQuery<T>(
  rootType: new () => T,
  info: GraphQLResolveInfo,
): Relation[] {
  return info.fieldNodes.reduce<Relation[]>((relations, fieldNode) => {
    return relations.concat(_getRelationsForFieldNode(
      rootType,
      fieldNode,
    ))
  }, [])
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
    return value.fields.reduce<{[key: string]: any}>((values, field) => {
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
