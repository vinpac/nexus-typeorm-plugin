import camelCase from 'camelcase'
import * as Nexus from 'nexus'
import { dynamicOutputMethod } from 'nexus'
import pluralize = require('pluralize')
import { SchemaBuilder } from '../schema-builder'
import { getEntityTypeName, grapQLInfoToEntityJoins } from '../util'
import { GraphQLResolveInfo, GraphQLFieldResolver } from 'graphql'
import { ArgsRecord, intArg, arg } from 'nexus/dist/core'
import { OutputPropertyFactoryConfig } from 'nexus/dist/dynamicProperty'
import { ArgWhereType } from '../args/arg-where'
import { createQueryBuilder, QueryBuilderConfig, createQueryBuilderConfig } from '../query-builder'
import { MapArgsFn } from '../args'

declare global {
  export interface NexusGenCustomOutputMethods<TypeName extends string> {
    crudField: CRUDFieldOutputMethod<any>
  }
}

export type FieldNamingStrategy = {
  [key: string]: (fieldName: string, entityName: string) => string
}
export const fieldNamingStrategy: FieldNamingStrategy = {
  findOne: (_, entityName) => camelCase(entityName),
  findMany: (_, entityName) => camelCase(pluralize(entityName)),
}

interface FindManyResolverArgs {
  where?: ArgWhereType
  first?: number
  last?: number
  skip?: number
  orderBy?: string[]
}

interface FindManyResolverContext {
  queryBuilderConfig?: OverrideQueryBuilderConfigFn
}

interface FindManyResolver<TType> {
  (
    source: any,
    args: FindManyResolverArgs,
    ctx: FindManyResolverContext | undefined,
    info: GraphQLResolveInfo,
  ): Promise<TType[]>
}

interface OverrideQueryBuilderConfigFn {
  (config: QueryBuilderConfig): QueryBuilderConfig
}

interface FindManyNextConfig<
  TType,
  TSource = any,
  TArgs = { [argName: string]: any },
  TContext = any
> extends Omit<FindManyResolveFnContext<TType, TSource, TArgs, TContext>, 'next'> {
  queryBuilderConfig?: OverrideQueryBuilderConfigFn
}

interface FindManyNextFn<TType, TSource = any, TArgs = { [argName: string]: any }, TContext = any> {
  (ctx: FindManyNextConfig<TType, TSource, TArgs, TContext>): Promise<TType[]>
}

export interface FindManyResolveFnContext<
  TType,
  TSource = any,
  TArgs = { [argName: string]: any },
  TContext = any
> {
  source: GraphQLFieldResolver<TSource, TArgs, TContext>
  args: { [argName: string]: any }
  context?: any
  info: GraphQLResolveInfo
  next: FindManyNextFn<TType, TSource, TArgs, TContext>
}

export interface FindManyResolveFn<TType> {
  (config: FindManyResolveFnContext<TType, any, any, any>): Promise<TType[]> | TType[]
}

export interface FindManyFieldPublisherConfig<TType> {
  type?: Nexus.core.AllOutputTypes
  args?: ArgsRecord | MapArgsFn
  sourceRelationPropertyName?: string
  resolve?: FindManyResolveFn<TType>
  nullable?: boolean
}

function defineFindManyField(
  entity: Function,
  { typeDef: t, builder }: OutputPropertyFactoryConfig<any>,
  schemaBuilder: SchemaBuilder,
  givenFieldName?: string,
  config: FindManyFieldPublisherConfig<any> = {},
) {
  const type = config.type || getEntityTypeName(entity)

  const resolver: FindManyResolver<any> = async (_, args, ctx, info) => {
    const queryBuilderConfig: QueryBuilderConfig = createQueryBuilderConfig(entity, {
      ...args,
      joins: grapQLInfoToEntityJoins(info, entity, schemaBuilder),
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
    where: arg({ type: schemaBuilder.useType(builder, { type: 'whereInput', entity }) }),
    orderBy: arg({
      type: schemaBuilder.useType(builder, { type: 'orderByInput', entity }),
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

  t.field(givenFieldName || fieldNamingStrategy.findMany('', type), {
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
interface FindOneResolverArgs {
  where?: ArgWhereType
  orderBy?: string[]
}

interface FindOneResolverContext {
  queryBuilderConfig?: OverrideQueryBuilderConfigFn
}

interface FindOneResolver<TType> {
  (
    source: any,
    args: FindOneResolverArgs,
    ctx: FindOneResolverContext | undefined,
    info: GraphQLResolveInfo,
  ): Promise<TType>
}

interface FindOneNextConfig<
  TType,
  TSource = any,
  TArgs = { [argName: string]: any },
  TContext = any
> extends Omit<FindOneResolveFnContext<TType, TSource, TArgs, TContext>, 'next'> {
  queryBuilderConfig?: OverrideQueryBuilderConfigFn
}

interface FindOneNextFn<TType, TSource = any, TArgs = { [argName: string]: any }, TContext = any> {
  (config: FindOneNextConfig<TType, TSource, TArgs, TContext>): Promise<TType[]>
}

export interface FindOneResolveFnContext<
  TType,
  TSource = any,
  TArgs = { [argName: string]: any },
  TContext = any
> {
  source: GraphQLFieldResolver<TSource, TArgs, TContext>
  args: { [argName: string]: any }
  context?: any
  info: GraphQLResolveInfo
  next: FindOneNextFn<TType, TSource, TArgs, TContext>
}

export interface FindOneResolveFn<TType> {
  (ctx: FindOneResolveFnContext<TType, any, any, any>): Promise<TType> | TType
}

export interface FindOneFieldPublisherConfig<TType> {
  type?: Nexus.core.AllOutputTypes
  args?: ArgsRecord | MapArgsFn
  nullable?: boolean
  sourceRelationPropertyName?: string
  resolve?: FindOneResolveFn<TType>
}

function defineFindOneField(
  entity: Function,
  { typeDef: t, builder }: OutputPropertyFactoryConfig<any>,
  schemaBuilder: SchemaBuilder,
  givenFieldName?: string,
  config: FindOneFieldPublisherConfig<any> = {},
) {
  const type = config.type || getEntityTypeName(entity)

  const resolver: FindOneResolver<any> = async (_, args, ctx, info) => {
    const queryBuilderConfig = createQueryBuilderConfig(entity, {
      ...args,
      joins: grapQLInfoToEntityJoins(info, entity, schemaBuilder),
    })
    const queryBuilder = createQueryBuilder<any>(
      ctx && ctx.queryBuilderConfig
        ? ctx.queryBuilderConfig(queryBuilderConfig)
        : queryBuilderConfig,
    )

    return await queryBuilder.getOne()
  }

  let args: ArgsRecord = {
    where: arg({ type: schemaBuilder.useType(builder, { type: 'whereInput', entity }) }),
    orderBy: arg({
      type: schemaBuilder.useType(builder, { type: 'orderByInput', entity }),
      list: true,
    }),
    ...config.args,
  }
  if (config && config.args) {
    if (typeof config.args === 'function') {
      args = config.args(args)
    } else {
      args = { ...args, ...config.args }
    }
  }

  t.field(givenFieldName || fieldNamingStrategy.findOne('', type), {
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

export interface CRUDFieldFindOneOutputMethodConfig<TType> {
  method: 'findOne'
  entity: string
  type: Nexus.AllOutputTypes
  filtering?: boolean
  resolve?: FindOneResolveFn<TType>
}

export interface CRUDFieldFindManyOutputMethodConfig<TType> {
  method: 'findMany'
  entity: string
  type: Nexus.AllOutputTypes
  args?: ArgsRecord | MapArgsFn
  filtering?: boolean
  resolve?: FindManyResolveFn<TType>
}

export type CRUDFieldOutputMethodConfig<TType> =
  | CRUDFieldFindOneOutputMethodConfig<TType>
  | CRUDFieldFindManyOutputMethodConfig<TType>

interface CRUDFieldOutputMethod<TType> {
  (fieldName: string, config: CRUDFieldOutputMethodConfig<TType>): void
}

export function buildCRUDOutputMethod(schemaBuilder: SchemaBuilder) {
  const cache = {}
  return dynamicOutputMethod({
    name: 'crudField',
    factory: factoryConfig => {
      const [fieldName, config] = factoryConfig.args as [string, CRUDFieldOutputMethodConfig<any>]
      const [entity] = schemaBuilder.getEntityDataTupleByTypeName(config.entity)

      if (!cache[config.entity]) {
        cache[config.entity] = {}
      }

      if (config.method === 'findMany') {
        defineFindManyField(entity, factoryConfig, schemaBuilder, fieldName, config)
      } else if (config.method === 'findOne') {
        defineFindOneField(entity, factoryConfig, schemaBuilder, fieldName, config)
      }
    },
  })
}
