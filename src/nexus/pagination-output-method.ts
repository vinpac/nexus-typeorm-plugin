import { dynamicOutputMethod } from 'nexus'
import { ArgsRecord, intArg, stringArg, arg } from 'nexus/dist/core'
import { GraphQLFieldResolver } from 'graphql'
import { SchemaBuilder } from '../schema-builder'
import { ORMResolverContext } from '../dataloader/entity-dataloader'
import { translateWhereClause, ArgWhere } from '../args/arg-where'
import { orderNamesToOrderInfos } from '../args/arg-order-by'
import { createQueryBuilder } from '../query-builder'
import { getEntityTypeName } from '../util'
import { getConnection } from 'typeorm'

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

declare global {
  export interface NexusGenCustomOutputMethods<TypeName extends string> {
    paginationField(fieldName: string, config: PaginationOutputMethodOptions): void
  }
}

interface PaginationOutputMethodOptions {
  type?: string
  entity: string
  args?: ArgsRecord
  sourceRelationPropertyName?: string
  resolve?: (
    source: any,
    args: any,
    ctx: any,
    info: any,
    next: GraphQLFieldResolver<any, any>,
  ) => any
}

export function createPaginationOutputMethod(schemaBuilder: SchemaBuilder) {
  return dynamicOutputMethod({
    name: 'paginationField',
    factory({ typeDef: t, args, builder }) {
      const [fieldName, options] = args as [string, PaginationOutputMethodOptions]
      const entity = schemaBuilder.entities[options.entity]
      const { name: entityTableName } = getConnection().getMetadata(entity)
      const type = options.type || getEntityTypeName(entity)

      const resolver: PaginationResolver<any, ORMResolverContext> = async (
        _: any,
        { where, orderBy, first, last, join },
        ctx: ORMResolverContext,
      ): Promise<any[] | undefined> => {
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

        const queryBuilder = createQueryBuilder<any>({
          entity,
          where: where && translateWhereClause(entityTableName, where),
          orders: orderBy && orderNamesToOrderInfos(orderBy),
          first,
          last,
          join,
        })

        return queryBuilder.getMany()
      }

      t.field(fieldName, {
        type,
        list: true,
        nullable: false,
        args: {
          first: intArg(),
          last: intArg(),
          after: stringArg(),
          before: stringArg(),
          skip: intArg(),
          where: arg({ type: schemaBuilder.useType(builder, { type: 'whereInput', entity }) }),
          orderBy: arg({
            type: schemaBuilder.useType(builder, { type: 'orderByInput', entity }),
            list: true,
          }),
          join: stringArg({ list: true }),
          ...options.args,
        },
        resolve: options.resolve
          ? (source, args, ctx, info) => options.resolve!(source, args, ctx, info, resolver)
          : resolver,
      })
    },
  })
}
