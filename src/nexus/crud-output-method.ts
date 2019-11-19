import { dynamicOutputMethod } from 'nexus'
import { SchemaBuilder } from '../schema-builder'
import { QueryBuilderConfig } from '../query-builder'
import { CreateOneFieldConfig, defineCreateOneField } from './crud/create-one-field'
import { FindOneFieldConfig, defineFindOneField } from './crud/find-one-field'
import { FindManyFieldConfig, defineFindManyField } from './crud/find-many-field'
import { GraphQLResolveInfo } from 'graphql'

declare global {
  export interface NexusGenCustomOutputMethods<TypeName extends string> {
    crudField: CRUDFieldOutputMethod<any>
  }
}

interface CRUDFieldConfigResolveContext<
  TSource = any,
  TArgs = { [argName: string]: any },
  TContext = any
> {
  source: TSource
  args: TArgs
  context: TContext
  info: GraphQLResolveInfo
}

interface CRUDFiedConfigResolveFnArg<
  TPayload,
  TExtraNextConfig = {},
  TSource = any,
  TArgs = { [argName: string]: any },
  TContext = any
> extends CRUDFieldConfigResolveContext<TSource, TArgs, TContext> {
  next: (
    config: CRUDFieldConfigResolveContext<TSource, TArgs, TContext> & TExtraNextConfig,
  ) => TPayload
}

export interface CRUDFieldConfigResolveFn<
  TPayload,
  TExtraNextConfig = {},
  TSource = any,
  TArgs = { [argName: string]: any },
  TContext = any
> {
  (arg: CRUDFiedConfigResolveFnArg<TPayload, TExtraNextConfig, TSource, TArgs, TContext>): TPayload
}

export interface OverrideQueryBuilderConfigFn {
  (config: QueryBuilderConfig): QueryBuilderConfig
}

export interface CRUDFieldFindOneOutputMethodConfig<TType> extends FindOneFieldConfig<TType> {
  entity: string
  method: 'findOne'
}

export interface CRUDFieldFindManyOutputMethodConfig<TType> extends FindManyFieldConfig<TType> {
  entity: string
  method: 'findMany'
}

export interface CRUDFieldCreateOneOutputMethodConfig<TType> extends CreateOneFieldConfig<TType> {
  entity: string
  method: 'createOne'
}

export type CRUDFieldOutputMethodConfig<TType> =
  | CRUDFieldFindOneOutputMethodConfig<TType>
  | CRUDFieldFindManyOutputMethodConfig<TType>
  | CRUDFieldCreateOneOutputMethodConfig<TType>

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
      } else if (config.method === 'createOne') {
        defineCreateOneField(entity, factoryConfig, schemaBuilder, fieldName, config)
      }
    },
  })
}
