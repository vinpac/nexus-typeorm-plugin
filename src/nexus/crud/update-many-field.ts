import { EntityTypeDefManager } from '../../entity-type-def-manager'
import * as Nexus from 'nexus'
import { OutputPropertyFactoryConfig } from 'nexus/dist/dynamicProperty'
import { MapArgsFn } from '../../args'
import { ArgsRecord } from 'nexus/dist/core'
import { CRUDFieldConfigResolveFn } from '../crud-field-output-method'
import { ArgWhereType, translateWhereClause } from '../../args/arg-where'
import { GraphQLFieldResolver } from 'graphql'
import { getConnection } from 'typeorm'

interface UpdateManyEntitiesArgs {
  set: { [propertyName: string]: any }
  where: ArgWhereType
}

export interface UpdateManyFieldPublisherConfig<TEntity> {
  type?: Nexus.core.AllOutputTypes
  args?: ArgsRecord | MapArgsFn
  resolve?: CRUDFieldConfigResolveFn<TEntity>
  nullable?: boolean
}

async function updateManyEntities<TEntity extends Function>(
  entity: TEntity,
  manager: EntityTypeDefManager,
  { set, where: whereRawExpression }: UpdateManyEntitiesArgs,
) {
  const conn = getConnection()
  const entityMetadata = manager.getEntityMetadata(entity)
  const where = translateWhereClause(entityMetadata.tableName, whereRawExpression)
  const entityRepository = conn.getRepository<TEntity>(entity)
  return await entityRepository
    .createQueryBuilder()
    .update(entity)
    .set(set)
    .where(where.expression, where.params)
    .execute()
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

  const resolve: GraphQLFieldResolver<any, any> = async (_, args) => {
    const result = await updateManyEntities(entity, manager, {
      // args.data is deleted for after before `qb.set` being excuted for some reason.
      // We must copy it
      set: { ...args.data },
      where: args.where,
    })

    return { affectedRows: result.affected }
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
            next: ctx => resolve(ctx.source, ctx.args, ctx.context, ctx.info),
          })
      : resolve,
  })
}
