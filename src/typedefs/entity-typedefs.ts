import { getConnection } from 'typeorm'
import { SchemaBuilder } from '../schema-builder'
import { columnToGraphQLTypeDef, createEntityEnumColumnTypeDefs } from '../type'
import { getDatabaseObjectMetadata } from '../decorators'
import { createPaginationField, ArgsPaginationGraphQLResolver } from '../fields/pagination-field'
import { createRelatedUniqueField } from '../fields/related-unique-field'
import { ArgWhere } from 'src/args/arg-where'

export const createEntityTypeDefs = (
  entity: Function,
  schemaBuilder: SchemaBuilder,
): SchemaBuilder => {
  const connection = getConnection()
  const { name: entityName } = getDatabaseObjectMetadata(entity)
  const entityMetadata = connection.getMetadata(entity)
  let nextSchemaBuilder = { ...schemaBuilder }

  let typeDefs = `type ${entityName} {`

  entityMetadata.ownColumns.forEach(column => {
    if (column.relationMetadata && column.isVirtual) {
      return
    }

    let fieldTypeName: string | undefined

    if (column.type === 'enum') {
      nextSchemaBuilder = createEntityEnumColumnTypeDefs(entity, column, nextSchemaBuilder)

      fieldTypeName = nextSchemaBuilder.meta[entityName].entityEnumColumnType[column.propertyName]
    } else {
      fieldTypeName = columnToGraphQLTypeDef(column, entity)
    }

    typeDefs += `\n    ${column.propertyName}: ${fieldTypeName}${column.isNullable ? '' : '!'}`
  })

  entityMetadata.relations.forEach(relation => {
    const { name: fieldTypeDef } = connection.getMetadata(relation.type)

    const inverseEntity = nextSchemaBuilder.entitiesMap[relation.inverseEntityMetadata.name]

    if (!inverseEntity) {
      throw new Error(
        `Entity ${relation.inverseEntityMetadata.name} on field ${entityName}.${relation.propertyName} was not found. Make sure you decorated it or passed to buildSchemaShape.`,
      )
    }

    if (relation.isOneToMany || relation.isManyToMany) {
      const inverseForeignKeyName = relation.inverseRelation!.foreignKeys[0].columnNames[0]
      nextSchemaBuilder = createPaginationField(
        nextSchemaBuilder.entitiesMap[relation.inverseEntityMetadata.name],
        nextSchemaBuilder,
        {
          fieldName: relation.propertyName,
          onType: entityName,
          transformArgs: (source, args) => {
            return {
              ...args,
              where: {
                ...args.where,
                [inverseForeignKeyName]: source[entityMetadata.primaryColumns[0].propertyName],
              } as ArgWhere,
            }
          },
          middleware: (source: any, args: ArgsPaginationGraphQLResolver) => {
            if (!args.where && source[relation.propertyName]) {
              return source[relation.propertyName]
            }
          },
        },
      )
    } else {
      typeDefs += `\n    ${relation.propertyName}: ${fieldTypeDef}`
      const inverseForeignKeyName = (relation.inverseRelation &&
      relation.inverseRelation.foreignKeys.length > 0
        ? relation.inverseRelation.foreignKeys[0]
        : relation.foreignKeys[0]
      ).columnNames[0]

      if (!entityMetadata.primaryColumns[0]) {
        // Maybe we should warn instead of throw an Error?
        // TODO: Test cases where there are entities without a primary key
        throw new Error(`Entity ${entityName} doesn't have a primary key`)
      }

      const relatedEntity = nextSchemaBuilder.entitiesMap[relation.inverseEntityMetadata.name]

      nextSchemaBuilder = createRelatedUniqueField(relatedEntity, nextSchemaBuilder, {
        onType: entityName,
        fieldName: relation.propertyName,
        sourceForeignKey: inverseForeignKeyName,
      })
    }
  })

  typeDefs += '\n}\n\n'
  nextSchemaBuilder.typeDefs += typeDefs

  return nextSchemaBuilder
}
