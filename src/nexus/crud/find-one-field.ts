import { createQueryBuilder, createQueryBuilderConfig } from '../../query-builder'
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
import { ArgOrderType } from '../../args/arg-order-by'

interface FindOneResolverArgs {
  where?: ArgWhereType
  orderBy?: ArgOrderType
}

export interface FindOneFieldNextFnExtraContext {
  queryBuilderConfig?: OverrideQueryBuilderConfigFn
}

interface FindOneResolver<TType> {
  (
    source: any,
    args: FindOneResolverArgs,
    ctx: FindOneFieldNextFnExtraContext | undefined,
    info: GraphQLResolveInfo,
  ): Promise<TType>
}

export interface FindOneFieldPublisherConfig<TEntity> {
  type?: Nexus.core.AllOutputTypes
  args?: ArgsRecord | MapArgsFn
  nullable?: boolean
  resolve?: CRUDFieldConfigResolveFn<TEntity, FindOneFieldNextFnExtraContext>
}

export function defineFindOneField(
  entity: Function,
  factoryConfig: OutputPropertyFactoryConfig<any>,
  manager: EntityTypeDefManager,
  givenFieldName?: string,
  config: FindOneFieldPublisherConfig<any> = {},
) {
  const { typeDef: t, builder } = factoryConfig
  const type = config.type || getEntityTypeName(entity)
  const resolver: FindOneResolver<any> = async (_, args, ctx, info) => {
    const queryBuilderConfig = createQueryBuilderConfig(entity, {
      ...args,
      joins: grapQLInfoToEntityJoins(info, entity, manager),
    })
    const queryBuilder = createQueryBuilder<any>(
      ctx && ctx.queryBuilderConfig
        ? ctx.queryBuilderConfig(queryBuilderConfig)
        : queryBuilderConfig,
    )

    return await queryBuilder.getOne()
  }

  let args: ArgsRecord = {
    where: arg({ type: manager.useWhereUniqueInputType(entity, builder) }),
    ...config.args,
  }
  if (config && config.args) {
    args = typeof config.args === 'function' ? config.args(args) : config.args
  }

  t.field(givenFieldName || namingStrategy.findOneField(type), {
    type,
    nullable: config.nullable,
    args,
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
                {
                  queryBuilderConfig: ctx.queryBuilderConfig,
                },
                ctx.info,
              ),
          })
      : (source, args, _, info) => resolver(source, args, undefined, info),
  })
}
