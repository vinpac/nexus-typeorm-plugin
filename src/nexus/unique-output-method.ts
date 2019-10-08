import { dynamicOutputMethod } from 'nexus'
import { ArgsRecord, stringArg, arg } from 'nexus/dist/core'
import { GraphQLFieldResolver } from 'graphql'
import { SchemaBuilder } from '../schema-builder'
import { ORMResolverContext } from '../dataloader/entity-dataloader'
import { translateWhereClause, ArgWhere } from '../args/arg-where'
import { orderNamesToOrderInfos } from '../args/arg-order-by'
import { createQueryBuilder } from '../query-builder'
import { getEntityTypeName, findEntityByTypeName } from '../util'
import { getConnection } from 'typeorm'

declare global {
  export interface NexusGenCustomOutputMethods<TypeName extends string> {
    uniqueField(fieldName: string, config: UniqueOutputMethodConfig): void
  }
}

export interface ArgsUniqueGraphQLResolver {
  where?: ArgWhere
  orderBy?: string[]
  join?: string[]
}

export type UniqueResolver<TSource, TContext> = GraphQLFieldResolver<
  TSource,
  TContext,
  ArgsUniqueGraphQLResolver
>

type UniqueFieldResolverFn = (
  source: any,
  args: any,
  ctx: any,
  info: any,
  next: GraphQLFieldResolver<any, any>,
) => any

interface UniqueOutputMethodConfig {
  type?: string
  entity: string
  nullable?: boolean
  args?: ArgsRecord
  sourceRelationPropertyName?: string
  resolve?: UniqueFieldResolverFn
}

export function createUniqueOutputMethod(schemaBuilder: SchemaBuilder) {
  return dynamicOutputMethod({
    name: 'uniqueField',
    factory({ typeDef: t, args, builder }) {
      const [fieldName, options] = args as [string, UniqueOutputMethodConfig]
      const entity = findEntityByTypeName(options.entity, schemaBuilder.entities)

      if (!entity) {
        throw new Error(`Unable to find entity '${options.entity}'`)
      }

      const entityTypeName = getEntityTypeName(entity)
      const { name: entityTableName } = getConnection().getMetadata(entity)

      const resolver: UniqueResolver<any, ORMResolverContext> = async (
        _: any,
        args: ArgsUniqueGraphQLResolver,
        ctx: ORMResolverContext,
      ) => {
        if (ctx && ctx.orm) {
          return ctx.orm.queryDataLoader.load({
            type: 'one',
            entity,
            where: args.where,
            orderBy: args.orderBy,
            join: args.join,
          })
        }

        const queryBuilder = createQueryBuilder<any>({
          entity,
          where: args.where && translateWhereClause(entityTableName, args.where),
          orders: args.orderBy && orderNamesToOrderInfos(args.orderBy),
          join: args.join,
        })

        return queryBuilder.getOne()
      }

      t.field(fieldName, {
        type: options.type || entityTypeName,
        nullable: options.nullable,
        args: {
          where: arg({
            type: schemaBuilder.useType(builder, { type: 'whereInput', entity }),
          }),
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
