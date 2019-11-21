import { dynamicOutputMethod } from 'nexus'
import { EntityTypeDefManager } from '../entity-type-def-manager'
import { QueryBuilderConfig } from '../query-builder'
import { CreateOneFieldConfig, defineCreateOneField } from './crud/create-one-field'
import { FindOneFieldConfig, defineFindOneField } from './crud/find-one-field'
import { FindManyFieldConfig, defineFindManyField } from './crud/find-many-field'
import { GraphQLResolveInfo } from 'graphql'

declare global {
  export interface NexusTypeORMCRUDMethod<TType> {
    (fieldName: string, config: CRUDOutputMethodConfig<TType>): void
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

interface CRUDFiedConfigResolveFnContext<
  TPayload,
  TExtraNextConfig = {},
  TSource = any,
  TArgs = { [argName: string]: any },
  TContext = any
> extends CRUDFieldConfigResolveContext<TSource, TArgs, TContext> {
  next: (
    config: CRUDFieldConfigResolveContext<TSource, TArgs, TContext> & TExtraNextConfig,
  ) => Promise<TPayload>
}

export interface CRUDFieldConfigResolveFn<
  TPayload,
  TExtraNextConfig = {},
  TSource = any,
  TArgs = { [argName: string]: any },
  TContext = any
> {
  (ctx: CRUDFiedConfigResolveFnContext<TPayload, TExtraNextConfig, TSource, TArgs, TContext>): any
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

export type CRUDOutputMethodConfig<TType> =
  | CRUDFieldFindOneOutputMethodConfig<TType>
  | CRUDFieldFindManyOutputMethodConfig<TType>
  | CRUDFieldCreateOneOutputMethodConfig<TType>

export function buildCRUDOutputMethod(manager: EntityTypeDefManager) {
  const cache = {}
  return dynamicOutputMethod({
    name: 'crudField',
    typeDefinition: ': NexusTypeORMCRUDMethod<NexusTypeORMEntity<TypeName>>',
    factory: factoryConfig => {
      const [fieldName, config] = factoryConfig.args as [string, CRUDOutputMethodConfig<any>]
      const [entity] = manager.getEntityDataTupleByTypeName(config.entity)

      if (!cache[config.entity]) {
        cache[config.entity] = {}
      }

      if (config.method === 'findMany') {
        defineFindManyField(entity, factoryConfig, manager, fieldName, config)
      } else if (config.method === 'findOne') {
        defineFindOneField(entity, factoryConfig, manager, fieldName, config)
      } else if (config.method === 'createOne') {
        defineCreateOneField(entity, factoryConfig, manager, fieldName, config)
      }
    },
  })
}
