import { EntityTypeDefManager } from '../../entity-type-def-manager'
import * as Nexus from 'nexus'
import { OutputPropertyFactoryConfig } from 'nexus/dist/dynamicProperty'
import { MapArgsFn } from '../../args'
import { ArgsRecord } from 'nexus/dist/core'
import { CRUDFieldConfigResolveFn } from '../crud-field-output-method'
import { ArgWhereType } from '../../args/arg-where'
import { GraphQLFieldResolver } from 'graphql'
import { createQueryBuilder, createQueryBuilderConfig } from '../../query-builder'

interface UpdateManyEntitiesArgs {
  data: { [propertyName: string]: any }
  where: ArgWhereType
}

export interface UpdateManyFieldPublisherConfig<TEntity> {
  type?: Nexus.core.AllOutputTypes
  args?: ArgsRecord | MapArgsFn
  resolve?: CRUDFieldConfigResolveFn<TEntity>
  nullable?: boolean
}

export function defineUpdateManyField(
  entity: any,
  factoryConfig: OutputPropertyFactoryConfig<any>,
  manager: EntityTypeDefManager,
  fieldName: string,
  config: UpdateManyFieldPublisherConfig<any> = {},
) {
  const { typeDef: t, builder } = factoryConfig
  const typeName = config.type || manager.useUpdateManyType(builder)

  let args: ArgsRecord = {
    data: Nexus.arg({
      type: manager.useUpdateInputType(entity, builder),
      nullable: false,
    }),
    where: Nexus.arg({
      type: manager.useWhereInputType(entity, builder),
      nullable: false,
    }),
  }

  if (config.args) {
    args = typeof config.args === 'function' ? config.args(args) : config.args
  }

  const resolve: GraphQLFieldResolver<unknown, unknown, UpdateManyEntitiesArgs> = async (
    _,
    args,
  ) => {
    const result = await createQueryBuilder(createQueryBuilderConfig(entity, { where: args.where }))
      .update(entity)
      .set(
        // args.data is deleted for after before `qb.set` being excuted for some reason.
        // We must copy it
        { ...args.data },
      )
      .execute()

    return { affectedRows: result.affected || result.raw.affectedRows }
  }

  t.field(fieldName, {
    args,
    type: typeName as any,
    nullable: config.nullable,
    resolve: config.resolve
      ? (source, args, context, info) =>
          config.resolve!({
            source,
            args,
            context,
            info,
            next: ctx => resolve(ctx.source, ctx.args as any, ctx.context, ctx.info),
          })
      : resolve,
  })
}
