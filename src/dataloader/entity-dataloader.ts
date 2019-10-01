import * as DataLoader from 'dataloader'
import { getConnection } from 'typeorm'
import { ArgWhere, translateWhereClause } from '../args/arg-where'
import { ArgOrder, orderNamesToOrderInfos } from '../args/arg-order-by'
import { createQueryBuilder } from '../query-builder'
import { getEntityName, getEntityPrimaryColumn } from '../util'

export const generateCacheKeyFromORMDataLoaderRequest = (req: QueryDataLoaderRequest<any>) => {
  let key = `${JSON.stringify(req.where)};${JSON.stringify(req.orderBy)}`
  if (req.type === 'list') {
    key += `;${req.first || 0};${req.last || 0}`
  }

  return `${req.type}${key}`
}

interface QueryListDataLoaderRequest<Model> {
  entity: Model
  type: 'list'
  where?: ArgWhere
  orderBy?: ArgOrder
  first?: number
  last?: number
  join?: string[]
}

interface QueryOneDataLoaderRequest<Model> {
  entity: Model
  type: 'one'
  where?: ArgWhere
  orderBy?: ArgOrder
  join?: string[]
}

export type QueryDataLoaderRequest<Model> =
  | QueryOneDataLoaderRequest<Model>
  | QueryListDataLoaderRequest<Model>

export type QueryDataLoader = DataLoader<QueryDataLoaderRequest<any>, any>
export function createQueryDataLoader(entitiesDataLoader?: EntityDataLoader<any>): QueryDataLoader {
  return new DataLoader<QueryDataLoaderRequest<any>, any>(
    requests =>
      Promise.all(
        requests.map(async req => {
          if (req.type === 'one') {
            const queryBuilder = createQueryBuilder<any>({
              entity: req.entity,
              where: req.where && translateWhereClause(getEntityName(req.entity), req.where),
              orders: req.orderBy && orderNamesToOrderInfos(req.orderBy),
              join: req.join,
            })

            const node = await queryBuilder.getOne()
            const primaryColumn = getEntityPrimaryColumn(req.entity)
            if (entitiesDataLoader) {
              entitiesDataLoader.prime(
                {
                  entity: req.entity,
                  value: node[primaryColumn.propertyName],
                },
                node,
              )
            }
            return node
          }

          const queryBuilder = createQueryBuilder<any>({
            entity: req.entity,
            where: req.where && translateWhereClause(getEntityName(req.entity), req.where),
            orders: req.orderBy && orderNamesToOrderInfos(req.orderBy),
            first: req.first,
            last: req.last,
            join: req.join,
          })

          return queryBuilder.getMany()
        }),
      ),
    {
      cacheKeyFn: generateCacheKeyFromORMDataLoaderRequest,
    },
  )
}

interface EntityDataLoaderRequest<Model> {
  entity: Model
  value: string
}

export const generateEntityDataLoaderCacheKey = (req: EntityDataLoaderRequest<any>) =>
  `primaryKey:${getEntityName(req.entity)}:${req.value}`

export type EntityDataLoader<Model> = DataLoader<EntityDataLoaderRequest<Model>, Model>
export const createEntityDataLoader = (): EntityDataLoader<any> => {
  return new DataLoader(
    (requests: EntityDataLoaderRequest<any>[]) =>
      Promise.all(
        requests.map(req =>
          getConnection()
            .getRepository(req.entity)
            .findOne(req.value),
        ),
      ),
    {
      cacheKeyFn: generateEntityDataLoaderCacheKey,
    },
  )
}

export interface ORMResolverContext {
  orm?: ORMContext
  ignoreErrors?: boolean
}
export interface ORMContext {
  entitiesDataLoader: EntityDataLoader<any>
  queryDataLoader: QueryDataLoader
}
export function createORMContext(): ORMContext {
  const entitiesDataLoader = createEntityDataLoader()
  return {
    entitiesDataLoader,
    queryDataLoader: createQueryDataLoader(entitiesDataLoader),
  }
}
