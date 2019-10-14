import * as DataLoader from 'dataloader'
import { getConnection } from 'typeorm'
import { ArgWhere, translateWhereClause } from '../args/arg-where'
import { ArgOrder, orderNamesToOrderInfos } from '../args/arg-order-by'
import { createQueryBuilder } from '../query-builder'
import { getEntityTypeName, getEntityPrimaryColumn } from '../util'

export const generateCacheKeyFromORMDataLoaderRequest = (req: QueryDataLoaderRequest<any>) => {
  let key = `${JSON.stringify(req.where)}${
    req.orderBy && req.orderBy.length ? `;${JSON.stringify(req.orderBy)}` : ''
  }`
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
    requests => {
      return Promise.all(
        requests.map(async req => {
          if (req.type === 'one') {
            const queryBuilder = createQueryBuilder<any>({
              entity: req.entity,
              where: req.where && translateWhereClause(getEntityTypeName(req.entity), req.where),
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
            where: req.where && translateWhereClause(getEntityTypeName(req.entity), req.where),
            orders: req.orderBy && orderNamesToOrderInfos(req.orderBy),
            first: req.first,
            last: req.last,
            join: req.join,
          })

          return queryBuilder.getMany()
        }),
      )
    },
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
  `primaryKey:${getEntityTypeName(req.entity)}:${req.value}`

export type EntityDataLoader<Model> = DataLoader<EntityDataLoaderRequest<Model>, Model>
export const createEntityDataLoader = (): EntityDataLoader<any> => {
  return new DataLoader(
    async (requests: EntityDataLoaderRequest<any>[]) => {
      const entityMap: { [entityName: string]: any } = {}
      const pksByEntityName: { [entityName: string]: string[] } = {}
      requests.forEach(req => {
        entityMap[req.entity.name] = req.entity

        if (!pksByEntityName[req.entity.name]) {
          pksByEntityName[req.entity.name] = []
        }

        pksByEntityName[req.entity.name].push(req.value)
      })

      const resultMap: { [key: string]: any } = {}
      await Promise.all(
        Object.keys(pksByEntityName).map(async entityName => {
          const entity = entityMap[entityName]
          const primaryColumn = getEntityPrimaryColumn(entity)
          const nodes = await getConnection()
            .getRepository<any>(entity)
            .findByIds(pksByEntityName[entityName])
          nodes.forEach(node => {
            resultMap[`${entityName}:${node[primaryColumn.propertyName]}`] = node
          })
        }),
      )

      return requests.map(req => resultMap[`${req.entity.name}:${req.value}`])
    },
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
