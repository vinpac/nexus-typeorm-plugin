import { dynamicOutputMethod } from 'nexus'
import { EntityTypeDefManager } from '../entity-type-def-manager'
import { QueryBuilderConfig } from '../query-builder'
import { CreateOneFieldPublisherConfig, defineCreateOneField } from './crud/create-one-field'
import { UpdateOneFieldPublisherConfig, defineUpdateOneField } from './crud/update-one-field'
import { UpdateManyFieldPublisherConfig, defineUpdateManyField } from './crud/update-many-field'
import { FindOneFieldPublisherConfig, defineFindOneField } from './crud/find-one-field'
import { FindManyFieldPublisherConfig, defineFindManyField } from './crud/find-many-field'
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

export interface CRUDFieldFindOneOutputMethodConfig<TType>
  extends FindOneFieldPublisherConfig<TType> {
  entity: string
  method: 'findOne'
}

export interface CRUDFieldFindManyOutputMethodConfig<TType>
  extends FindManyFieldPublisherConfig<TType> {
  entity: string
  method: 'findMany'
}

export interface CRUDFieldCreateOneOutputMethodConfig<TType>
  extends CreateOneFieldPublisherConfig<TType> {
  entity: string
  method: 'createOne'
}

export interface CRUDFieldUpdateOneOutputMethodConfig<TType>
  extends UpdateOneFieldPublisherConfig<TType> {
  entity: string
  method: 'updateOne'
}
export interface CRUDFieldUpdateManyOutputMethodConfig<TType>
  extends UpdateManyFieldPublisherConfig<TType> {
  entity: string
  method: 'updateMany'
}

export type CRUDOutputMethodConfig<TType> =
  | CRUDFieldFindOneOutputMethodConfig<TType>
  | CRUDFieldFindManyOutputMethodConfig<TType>
  | CRUDFieldCreateOneOutputMethodConfig<TType>
  | CRUDFieldUpdateOneOutputMethodConfig<TType>
  | CRUDFieldUpdateManyOutputMethodConfig<TType>

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
      } else if (config.method === 'updateOne') {
        defineUpdateOneField(entity, factoryConfig, manager, fieldName, config)
      } else if (config.method === 'updateMany') {
        defineUpdateManyField(entity, factoryConfig, manager, fieldName, config)
      }
    },
  })
}
