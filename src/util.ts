import { GraphQLResolveInfo, NameNode, SelectionNode, SelectionSetNode, FieldNode } from 'graphql'
import { getConnection } from 'typeorm'

function _getRelationsForSelectionSet<T>(
  rootType: new () => T,
  selectionSet: SelectionSetNode,
): string[] {
  const conn = getConnection()
  const meta = conn.getMetadata(rootType)

  const { relations } = meta
  const relationStrings: string[] = []

  selectionSet.selections.forEach((selection: SelectionNode) => {
    if ('name' in selection) {
      const name: NameNode = selection.name
      const targetRelation = relations.find(relation =>
        relation.propertyPath === name.value
      )

      if (targetRelation) {
        relationStrings.push(targetRelation.propertyPath)

        if ('selectionSet' in selection && selection.selectionSet) {
          const subselections = _getRelationsForSelectionSet(
            targetRelation.type as any,
            selection.selectionSet,
          )

          subselections.forEach(
            subselection => relationStrings.push(
              `${targetRelation.propertyPath}.${subselection}`
            ),
          )
        }
      }
    }
  })

  return relationStrings
}

function _getRelationsForFieldNode<T>(
  rootType: new () => T,
  fieldNode: FieldNode,
): string[] {
  const { selectionSet } = fieldNode

  if (selectionSet) {
    return _getRelationsForSelectionSet(
      rootType,
      selectionSet,
    )
  }
  return []
}

export function getRelationsForQuery<T>(
  rootType: new () => T,
  info: GraphQLResolveInfo,
) {
  return info.fieldNodes.reduce<string[]>((relations, fieldNode) => {
    return relations.concat(_getRelationsForFieldNode(
      rootType,
      fieldNode,
    ))
  }, [])
}
