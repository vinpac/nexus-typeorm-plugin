import { SchemaBuilder, TypeResolversMap } from '../schema-builder'
import { getDatabaseObjectMetadata } from '../decorators'
import { makeFirstLetterLowerCase } from '../util'
import { ORMResolverContext } from '../dataloader/entity-dataloader'
import { getConnection } from 'typeorm'
import { ArgsUniqueGraphQLResolver } from './unique-field'

interface RelatedEntityUniqueFieldOptions {
  onType: string
  sourceForeignKey: string
  propertyName: string
  fieldName?: string
}

export function createRelatedUniqueField<TModel extends Function, TRelatedModel extends Function>(
  entity: TModel,
  relatedEntity: TRelatedModel,
  schemaBuilder: SchemaBuilder,
  options: RelatedEntityUniqueFieldOptions,
): SchemaBuilder {
  const { name: entityName } = getDatabaseObjectMetadata(entity)
  const { name: relatedEntityName } = getDatabaseObjectMetadata(relatedEntity)
  const {
    onType,
    sourceForeignKey,
    fieldName = makeFirstLetterLowerCase(relatedEntityName),
  } = options

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

  nextSchemaBuilder.resolversMap[onType] = {
    ...nextSchemaBuilder.resolversMap[onType],
    [fieldName]: async (source: any, args: ArgsUniqueGraphQLResolver, ctx: ORMResolverContext) => {
      if (source[options.propertyName]) {
        if (args.join && !(ctx && ctx.ignoreErrors)) {
          throw new Error('Join argument is ignored here because a this field was already joined')
        }

        return source[options.propertyName]
      }

      if (!Object.prototype.hasOwnProperty.call(source, sourceForeignKey)) {
        if (!ctx || !ctx.ignoreErrors) {
          throw new Error(
            `Foreign key '${sourceForeignKey}' is not defined in ${entityName} schema`,
          )
        }

        return null
      }

      if (ctx && ctx.orm) {
        return ctx.orm.entitiesDataLoader.load({
          entity: relatedEntity,
          value: source[sourceForeignKey],
        })
      }

      return getConnection()
        .getRepository(relatedEntity)
        .findOne(source[sourceForeignKey])
    },
  } as TypeResolversMap

  return nextSchemaBuilder
}
