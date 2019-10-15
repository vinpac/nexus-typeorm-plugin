import { dynamicOutputMethod } from 'nexus'
import { ArgsRecord, intArg, arg } from 'nexus/dist/core'
import { GraphQLFieldResolver } from 'graphql'
import { SchemaBuilder } from '../schema-builder'
import { ORMResolverContext } from '../dataloader/entity-dataloader'
import { translateWhereClause, ArgWhereType } from '../args/arg-where'
import { orderNamesToOrderInfos } from '../args/arg-order-by'
import { createQueryBuilder } from '../query-builder'
import { getEntityTypeName, findEntityByTypeName, grapQLInfoToEntityJoins } from '../util'
import { getConnection } from 'typeorm'

export interface ArgsPaginationGraphQLResolver {
  where?: ArgWhereType
  first?: number
  last?: number
  skip?: number
  orderBy?: string[]
}

export type PaginationResolver<TSource, TContext> = GraphQLFieldResolver<
  TSource,
  TContext,
  ArgsPaginationGraphQLResolver
>

declare global {
  export interface NexusGenCustomOutputMethods<TypeName extends string> {
    paginationField(fieldName: string, config: PaginationOutputMethodConfig): void
  }
}

export type PaginationFieldResolveFn = (
  source: any,
  args: any,
  ctx: any,
  info: any,
  next: GraphQLFieldResolver<any, any>,
) => any

interface PaginationOutputMethodConfig {
  type?: string
  entity: string
  args?: ArgsRecord
  sourceRelationPropertyName?: string
  resolve?: PaginationFieldResolveFn
}

export function createPaginationOutputMethod(schemaBuilder: SchemaBuilder) {
  return dynamicOutputMethod({
    name: 'paginationField',
    factory({ typeDef: t, args, builder }) {
      const [fieldName, options] = args as [string, PaginationOutputMethodConfig]
      const entity = findEntityByTypeName(options.entity, schemaBuilder.entities)

      if (!entity) {
        throw new Error(`Unable to find entity '${options.entity}'`)
      }

      const { name: entityTableName } = getConnection().getMetadata(entity)
      const type = options.type || getEntityTypeName(entity)

      const resolver: PaginationResolver<any, ORMResolverContext> = async (
        _: any,
        args,
        ctx: ORMResolverContext,
        info,
      ): Promise<any[] | undefined> => {
        const join = grapQLInfoToEntityJoins(info, entity, schemaBuilder)

        if (ctx && ctx.orm) {
          return ctx.orm.queryDataLoader.load({
            type: 'list',
            entity,
            schemaBuilder,
            where: args.where,
            orderBy: args.orderBy,
            first: args.first,
            last: args.last,
            join,
          })
        }

        const queryBuilder = createQueryBuilder<any>(schemaBuilder, {
          entity,
          where: args.where && translateWhereClause(entityTableName, args.where),
          orders: args.orderBy && orderNamesToOrderInfos(args.orderBy),
          first: args.first,
          last: args.last,
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
          skip: intArg(),
          where: arg({ type: schemaBuilder.useType(builder, { type: 'whereInput', entity }) }),
          orderBy: arg({
            type: schemaBuilder.useType(builder, { type: 'orderByInput', entity }),
            list: true,
          }),
          ...options.args,
        },
        resolve: options.resolve
          ? (source, args, ctx, info) => options.resolve!(source, args, ctx, info, resolver)
          : resolver,
      })
    },
  })
}
