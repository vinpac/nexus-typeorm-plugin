import { GraphQLResolveInfo, NameNode, SelectionNode, FieldNode, ValueNode } from 'graphql'
import { getConnection } from 'typeorm'

export interface Relation {
  relationPath: string
  fieldNode: FieldNode
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
