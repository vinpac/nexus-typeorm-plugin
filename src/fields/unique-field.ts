import { SchemaBuilder, TypeResolversMap } from '../schema-builder'
import { getDatabaseObjectMetadata } from '../decorators'
import { makeFirstLetterLowerCase } from '../util'
import { ArgWhere, translateWhereClause, createWhereInputTypeDef } from '../args/arg-where'
import { GraphQLFieldResolver } from 'graphql'
import { createQueryBuilder } from '../query-builder'
import { createOrderByInputTypeDef, orderNamesToOrderInfos } from '../args/arg-order-by'
import { ORMResolverContext } from '../dataloader/entity-dataloader'

interface EntityUniqueFieldOptions {
  onType?: string
  fieldName?: string
}

export interface ArgsUniqueGraphQLResolver {
  where: ArgWhere
  orderBy: string[]
}

export type UniqueResolver<TSource, TContext> = GraphQLFieldResolver<
  TSource,
  TContext,
  ArgsUniqueGraphQLResolver
>

export function createUniqueField<Model extends Function>(
  entity: Model,
  schemaBuilder: SchemaBuilder,
  options: EntityUniqueFieldOptions = {},
): SchemaBuilder {
  const { name: entityName } = getDatabaseObjectMetadata(entity)
  const { onType = 'Query', fieldName = makeFirstLetterLowerCase(entityName) } = options || {}

  if (
    schemaBuilder.meta[entityName].uniqueFieldName[onType] &&
    schemaBuilder.meta[entityName].uniqueFieldName[onType].includes(fieldName)
  ) {
    return schemaBuilder
  }

  let nextSchemaBuilder = createWhereInputTypeDef(entity, schemaBuilder)
  nextSchemaBuilder = createOrderByInputTypeDef(entity, nextSchemaBuilder)

  const { whereInputTypeName, orderByInputTypeName } = nextSchemaBuilder.meta[entityName]

  nextSchemaBuilder.meta[entityName].uniqueFieldName[onType] = [
    ...(nextSchemaBuilder.meta[entityName].uniqueFieldName[onType] || []),
    fieldName,
  ]
  nextSchemaBuilder.typeDefs += `\n
type ${onType} {
  ${fieldName}(
    where: ${whereInputTypeName}!
    orderBy: [${orderByInputTypeName}!]
  ): ${entityName}
}\n\n`
  nextSchemaBuilder.resolversMap[onType] = {
    ...nextSchemaBuilder.resolversMap[onType],
    [fieldName]: async (_: any, args: ArgsUniqueGraphQLResolver, ctx: ORMResolverContext) => {
      if (ctx && ctx.orm) {
        return ctx.orm.queryDataLoader.load({
          type: 'one',
          entity,
          where: args.where,
          orderBy: args.orderBy,
        })
      }

      const queryBuilder = createQueryBuilder<Model>({
        entity,
        where: args.where && translateWhereClause(entityName, args.where),
        orders: args.orderBy && orderNamesToOrderInfos(args.orderBy),
      })

      return queryBuilder.getOne()
    },
  } as TypeResolversMap

  return nextSchemaBuilder
}
