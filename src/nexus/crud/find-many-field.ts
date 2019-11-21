import {
  createQueryBuilder,
  createQueryBuilderConfig,
  QueryBuilderConfig,
} from '../../query-builder'
import * as Nexus from 'nexus'
import { ArgWhereType } from '../../args/arg-where'
import { ArgsRecord, arg } from 'nexus/dist/core'
import { namingStrategy } from '../naming-strategy'
import { MapArgsFn } from '../../args'
import { grapQLInfoToEntityJoins, getEntityTypeName } from '../../util'
import { EntityTypeDefManager } from '../../entity-type-def-manager'
import { OutputPropertyFactoryConfig } from 'nexus/dist/dynamicProperty'
import { GraphQLResolveInfo } from 'graphql'
import { OverrideQueryBuilderConfigFn, CRUDFieldConfigResolveFn } from '../crud-field-output-method'
import { intArg } from 'nexus'

interface FindManyResolverArgs {
  where?: ArgWhereType
  first?: number
  last?: number
  skip?: number
  orderBy?: string[]
}

export interface FindManyFieldNextFnExtraContext {
  queryBuilderConfig?: OverrideQueryBuilderConfigFn
}

interface FindManyResolver<TType> {
  (
    source: any,
    args: FindManyResolverArgs,
    ctx: FindManyFieldNextFnExtraContext | undefined,
    info: GraphQLResolveInfo,
  ): Promise<TType[]>
}

export interface FindManyFieldPublisherConfig<TType> {
  type?: Nexus.core.AllOutputTypes
  args?: ArgsRecord | MapArgsFn
  resolve?: CRUDFieldConfigResolveFn<TType[], FindManyFieldNextFnExtraContext>
  nullable?: boolean
}
export function defineFindManyField(
  entity: Function,
  { typeDef: t, builder }: OutputPropertyFactoryConfig<any>,
  manager: EntityTypeDefManager,
  givenFieldName?: string,
  config: FindManyFieldPublisherConfig<any> = {},
) {
  const type = config.type || getEntityTypeName(entity)

  const resolver: FindManyResolver<any> = async (_, args, ctx, info) => {
    const queryBuilderConfig: QueryBuilderConfig = createQueryBuilderConfig(entity, {
      ...args,
      joins: grapQLInfoToEntityJoins(info, entity, manager),
    })
    const queryBuilder = createQueryBuilder<any>(
      ctx && ctx.queryBuilderConfig
        ? ctx.queryBuilderConfig(queryBuilderConfig)
        : queryBuilderConfig,
    )

    return await queryBuilder.getMany()
  }

  let args: ArgsRecord = {
    first: intArg(),
    last: intArg(),
    skip: intArg(),
    where: arg({ type: manager.useWhereInputType(entity, builder) }),
    orderBy: arg({
      type: manager.useOrderByInputType(entity, builder),
      list: true,
    }),
  }

  if (config && config.args) {
    if (typeof config.args === 'function') {
      args = config.args(args)
    } else {
      args = { ...args, ...config.args }
    }
  }

  t.field(givenFieldName || namingStrategy.findManyField(type), {
    type,
    args,
    list: true,
    nullable: config.nullable,
    resolve: config.resolve
      ? (source, args, context, info) =>
          config.resolve!({
            source,
            args,
            context,
            info,
            next: ctx =>
              resolver(
                ctx.source,
                ctx.args,
                { queryBuilderConfig: ctx.queryBuilderConfig },
                ctx.info,
              ),
          })
      : (source, args, _, info) => resolver(source, args, undefined, info),
  })
}
