import { SchemaBuilder, TypeResolversMap } from '../schema-builder'
import { getDatabaseObjectMetadata } from '@/decorators'
import { makeFirstLetterLowerCase } from '@/util'
import * as pluralize from 'pluralize'
import { ArgWhere, translateWhereClause, createWhereInputTypeDef } from '@/args/arg-where'
import { GraphQLFieldResolver } from 'graphql'
import { createQueryBuilder } from '../query-builder'
import { createOrderByInputTypeDef, orderNamesToOrderInfos } from '@/args/arg-order-by'
import { ORMResolverContext } from '@/dataloader/entity-dataloader'

interface EntityPaginationFieldOptions {
  fieldName?: string
  onType?: string
  transformArgs?: (source: any, args: any) => any
}

export interface ArgsPaginationGraphQLResolver {
  where?: ArgWhere
  first?: number
  last?: number
  skip?: number
  after?: string
  before?: string
  orderBy?: string[]
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

  const resolver: PaginationResolver<any, any> = async (
    source: any,
    args: ArgsPaginationGraphQLResolver,
    ctx: ORMResolverContext,
  ): Promise<Model[] | undefined> => {
    const { where, orderBy, first, last } = transformArgs ? transformArgs(source, args) : args
    if (ctx && ctx.orm) {
      return ctx.orm.queryDataLoader.load({
        type: 'list',
        entity,
        where,
        orderBy,
        first,
        last,
      })
    }

    const queryBuilder = createQueryBuilder<Model>({
      entity,
      where: where && translateWhereClause(entityName, where),
      orders: orderBy && orderNamesToOrderInfos(orderBy),
      first,
      last,
    })

    return queryBuilder.getMany()
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
  ): [${entityName}!]!
}\n\n`

  nextSchemaBuilder.resolversMap[onType] = {
    ...nextSchemaBuilder.resolversMap[onType],
    [fieldName]: resolver,
  } as TypeResolversMap

  return nextSchemaBuilder
}
