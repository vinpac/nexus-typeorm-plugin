import { SchemaBuilder, TypeResolversMap } from '../schema-builder'
import { getDatabaseObjectMetadata } from '../decorators'
import { getEntityPrimaryColumn } from '../util'
import { ORMResolverContext } from '../dataloader/entity-dataloader'
import { getConnection } from 'typeorm'
import { ArgsUniqueGraphQLResolver } from './unique-field'
import { RelationMetadata } from 'typeorm/metadata/RelationMetadata'
import { ArgWhere } from '../args/arg-where'

interface RelatedEntityUniqueFieldOptions {
  onType?: string
  fieldName?: string
}

export function createRelatedUniqueField<Model extends Function>(
  entity: Model,
  relation: RelationMetadata,
  schemaBuilder: SchemaBuilder,
  options: RelatedEntityUniqueFieldOptions = {},
): SchemaBuilder {
  const relatedEntity = schemaBuilder.entitiesMap[relation.inverseEntityMetadata.name]
  const { name: entityName } = getDatabaseObjectMetadata(entity)
  const { name: relatedEntityName } = getDatabaseObjectMetadata(relatedEntity)
  const { onType = entityName, fieldName = relation.propertyName } = options
  const sourceForeignKey = (relation.inverseRelation &&
  relation.inverseRelation.foreignKeys.length > 0
    ? relation.inverseRelation.foreignKeys[0]
    : relation.foreignKeys[0]
  ).columnNames[0]

  if (
    schemaBuilder.meta[relatedEntityName].uniqueFieldName[onType] &&
    schemaBuilder.meta[relatedEntityName].uniqueFieldName[onType].includes(fieldName)
  ) {
    return schemaBuilder
  }
  const nextSchemaBuilder = { ...schemaBuilder }
  nextSchemaBuilder.typeDefs += `
    type ${onType} {
      ${fieldName}: ${relatedEntityName}
    }
  `

  const isRelationOwner = relation.isOneToOneOwner || relation.isManyToOne
  const entityPrimaryKey = getEntityPrimaryColumn(entity)
  nextSchemaBuilder.resolversMap[onType] = {
    ...nextSchemaBuilder.resolversMap[onType],
    [fieldName]: async (source: any, args: ArgsUniqueGraphQLResolver, ctx: ORMResolverContext) => {
      if (source[relation.propertyName]) {
        if (args.join && !(ctx && ctx.ignoreErrors)) {
          throw new Error('Join argument is ignored here because a this field was already joined')
        }

        return source[relation.propertyName]
      }

      if (isRelationOwner && !Object.prototype.hasOwnProperty.call(source, sourceForeignKey)) {
        if (!ctx || !ctx.ignoreErrors) {
          throw new Error(
            `Foreign key '${sourceForeignKey}' is not defined in ${entityName} schema`,
          )
        }

        return null
      }

      if (ctx && ctx.orm) {
        return isRelationOwner
          ? ctx.orm.entitiesDataLoader.load({
              entity: relatedEntity,
              value: source[sourceForeignKey],
            })
          : ctx.orm.queryDataLoader.load({
              entity,
              type: 'one',
              where: {
                [sourceForeignKey]: source[entityPrimaryKey.propertyName],
              } as ArgWhere,
            })
      }

      if (isRelationOwner) {
        return getConnection()
          .getRepository(relatedEntity)
          .findOne({ [sourceForeignKey]: source[entityPrimaryKey.propertyName] })
      }

      return getConnection()
        .getRepository(relatedEntity)
        .findOne(source[sourceForeignKey])
    },
  } as TypeResolversMap

  return nextSchemaBuilder
}
