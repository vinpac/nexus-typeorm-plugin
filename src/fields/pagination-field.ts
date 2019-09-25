import { SchemaBuilder, TypeResolversMap } from '../schema-builder'
import { getDatabaseObjectMetadata } from '../decorators'
import { makeFirstLetterLowerCase } from '../util'
import * as pluralize from 'pluralize'
import { ArgWhere, translateWhereClause, createWhereInputTypeDef } from '../args/arg-where'
import { GraphQLFieldResolver } from 'graphql'
import { createQueryBuilder } from '../query-builder'
import { createOrderByInputTypeDef, orderNamesToOrderInfos } from '../args/arg-order-by'
import { ORMResolverContext } from '../dataloader/entity-dataloader'

interface EntityPaginationFieldOptions<MiddlewareTSource = any, MiddlewareTContext = any> {
  fieldName?: string
  onType?: string
  transformArgs?: (
    source: any,
    args: ArgsPaginationGraphQLResolver,
  ) => ArgsPaginationGraphQLResolver
  middleware?: GraphQLFieldResolver<
    MiddlewareTSource,
    MiddlewareTContext,
    ArgsPaginationGraphQLResolver
  >
}

export interface ArgsPaginationGraphQLResolver {
  where?: ArgWhere
  first?: number
  last?: number
  skip?: number
  after?: string
  before?: string
  orderBy?: string[]
  join?: string[]
}

export type PaginationResolver<TSource, TContext> = GraphQLFieldResolver<
  TSource,
  TContext,
  ArgsPaginationGraphQLResolver
>

export function createPaginationField<Model extends Function>(
  entity: Model,
  schemaBuilder: SchemaBuilder,
  options: EntityPaginationFieldOptions = {},
): SchemaBuilder {
  const { name: entityName } = getDatabaseObjectMetadata(entity)
  const { onType = 'Query', transformArgs } = options
  let fieldName = options.fieldName
  if (!fieldName) {
    fieldName = pluralize(makeFirstLetterLowerCase(entityName))
    if (fieldName === makeFirstLetterLowerCase(entityName)) {
      fieldName += 'List'
    }
  }
  let nextSchemaBuilder = createWhereInputTypeDef(entity, schemaBuilder)
  nextSchemaBuilder = createOrderByInputTypeDef(entity, nextSchemaBuilder)

  const resolver: PaginationResolver<any, ORMResolverContext> = async (
    source: any,
    args,
    ctx,
    info,
  ): Promise<Model[] | undefined> => {
    if (options.middleware) {
      const middlewareResult = options.middleware(source, args, ctx, info)

      if (typeof middlewareResult !== 'undefined') {
        return middlewareResult
      }
    }

    const { where, orderBy, first, last, join } = transformArgs ? transformArgs(source, args) : args
    if (ctx && ctx.orm) {
      return ctx.orm.queryDataLoader.load({
        type: 'list',
        entity,
        where,
        orderBy,
        first,
        last,
        join,
      })
    }

    const queryBuilder = createQueryBuilder<Model>({
      entity,
      where: where && translateWhereClause(entityName, where),
      orders: orderBy && orderNamesToOrderInfos(orderBy),
      first,
      last,
      join,
    })

    const result = await queryBuilder.getMany()
    return result
  }

  nextSchemaBuilder.typeDefs += `
type ${onType} {
  ${fieldName}(
    first: Int
    last: Int
    after: String
    before: String
    skip: Int
    where: ${nextSchemaBuilder.meta[entityName].whereInputTypeName}
    orderBy: [${nextSchemaBuilder.meta[entityName].orderByInputTypeName}!]
    join: [String!]
  ): [${entityName}!]!
}\n\n`

  nextSchemaBuilder.resolversMap[onType] = {
    ...nextSchemaBuilder.resolversMap[onType],
    [fieldName]: resolver,
  } as TypeResolversMap

  return nextSchemaBuilder
}
