import { getEntityTypeName, getEntityPrimaryColumn } from '../../util'
import { EntityTypeDefManager } from '../../entity-type-def-manager'
import * as Nexus from 'nexus'
import { OutputPropertyFactoryConfig } from 'nexus/dist/dynamicProperty'
import { MapArgsFn } from '../../args'
import { ArgsRecord } from 'nexus/dist/core'
import { CRUDFieldConfigResolveFn } from '../crud-field-output-method'
import { getConnection } from 'typeorm'
import { translateWhereClause, ArgWhereType } from '../../args/arg-where'
import { GraphQLFieldResolver } from 'graphql'
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity'

export interface UpdateOneFieldPublisherConfig<TEntity> {
  type?: Nexus.core.AllOutputTypes
  args?: ArgsRecord | MapArgsFn
  resolve?: CRUDFieldConfigResolveFn<TEntity>
  nullable?: boolean
}

export interface UpdateManyFieldPublisherConfig<TEntity> {
  type?: Nexus.core.AllOutputTypes
  args?: ArgsRecord | MapArgsFn
  resolve?: CRUDFieldConfigResolveFn<TEntity>
  nullable?: boolean
}

interface UpdateOneEntityArgs {
  set: { [propertyName: string]: any }
  where: ArgWhereType
}

async function updateOneEntity<TEntity extends Function>(
  entity: TEntity,
  manager: EntityTypeDefManager,
  { set, where: whereRawExpression }: UpdateOneEntityArgs,
): Promise<TEntity> {
  const conn = getConnection()
  const entityMetadata = manager.getEntityMetadata(entity)
  const where = translateWhereClause(entityMetadata.tableName, whereRawExpression)
  const entityRepository = conn.getRepository<TEntity>(entity)
  const entityPrimaryColumn = getEntityPrimaryColumn(entity)
  const entityInstance = await entityRepository
    .createQueryBuilder()
    .where(where.expression, where.params)
    .getOne()

  if (!entityInstance) {
    throw new Error('Unable to find entity')
  }

  await entityRepository.update(
    entityInstance[entityPrimaryColumn.propertyName],
    set as QueryDeepPartialEntity<TEntity>,
  )

  Object.assign(entityInstance, set)
  return entityRepository.findOne(entityInstance[entityPrimaryColumn.propertyName]) as Promise<
    TEntity
  >
}

export function defineUpdateOneField(
  entity: any,
  factoryConfig: OutputPropertyFactoryConfig<any>,
  manager: EntityTypeDefManager,
  fieldName: string,
  config: UpdateOneFieldPublisherConfig<any> = {},
) {
  const { typeDef: t, builder } = factoryConfig
  const typeName = config.type || getEntityTypeName(entity)

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

  const resolve: GraphQLFieldResolver<any, any> = async (_, args) =>
    updateOneEntity(entity, manager, {
      // args.data is deleted for after before `qb.set` being excuted for some reason.
      // We must copy it
      set: { ...args.data },
      where: args.where,
    })

  t.field(fieldName, {
    args,
    type: typeName,
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
