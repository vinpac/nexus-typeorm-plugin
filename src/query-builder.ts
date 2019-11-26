import { TranslatedWhere, ArgWhereType, translateWhereClause } from './args/arg-where'
import { getConnection, SelectQueryBuilder } from 'typeorm'
import { OrderInfo, ArgOrder, orderNamesToOrderInfos } from './args/arg-order-by'

export interface EntityJoin {
  type: 'inner' | 'left'
  propertyPath: string
  where?: TranslatedWhere
  select?: boolean
}

export interface QueryBuilderConfig {
  entity: Function
  alias: string
  first?: number
  last?: number
  where?: TranslatedWhere
  orders?: OrderInfo[]
  joins?: EntityJoin[]
}

export function propertyPathToAlias(propertyPath: string) {
  return propertyPath.replace(/\./g, '_')
}

function populateQueryBuilder<Model>(
  queryBuilder: SelectQueryBuilder<Model>,
  config: QueryBuilderConfig,
) {
  if (config.first !== undefined) {
    queryBuilder.take(config.first)
  } else if (config.last !== undefined) {
    queryBuilder.take(config.last)
  }

  if (config.where) {
    queryBuilder.where(config.where.expression, config.where.params)
  }

  const ordersWithDepth: {
    depth: number
    order: OrderInfo
  }[] =
    (config.orders &&
      config.orders.map(order => ({
        depth: 0,
        order,
      }))) ||
    []

  if (ordersWithDepth.length) {
    const sortedOrdersWithDepth = ordersWithDepth.sort((a, b) => a.depth - b.depth)

    sortedOrdersWithDepth.forEach(order =>
      queryBuilder.addOrderBy(`${config.alias}.${order.order.propertyName}`, order.order.type),
    )
  }
  if (config.joins) {
    config.joins.forEach(join => {
      const propertyPathPieces = join.propertyPath.split('.')
      const method = `${join.type}Join${join.select !== false ? 'AndSelect' : ''}` as
        | 'innerJoin'
        | 'leftJoin'
        | 'leftJoinAndSelect'
        | 'innerJoinAndSelect'

      queryBuilder[method](
        propertyPathPieces.length > 1
          ? `${propertyPathPieces.slice(0, propertyPathPieces.length - 1).join('_')}.${
              propertyPathPieces[propertyPathPieces.length - 1]
            }`
          : `${config.alias}.${join.propertyPath}`,
        propertyPathToAlias(join.propertyPath),
        join.where && join.where.expression,
        join.where && join.where.params,
      )
    })
  }

  return queryBuilder
}

interface CreateQueryBuilderConfigOptions {
  alias?: string
  where?: ArgWhereType
  orderBy?: ArgOrder
  joins?: EntityJoin[]
  first?: number
  last?: number
}

export function createQueryBuilderConfig(
  entity: Function,
  options: CreateQueryBuilderConfigOptions,
): QueryBuilderConfig {
  const alias = options.alias || getConnection().getMetadata(entity).tableName
  return {
    entity,
    alias,
    where: options.where ? translateWhereClause(alias, options.where) : undefined,
    orders: options.orderBy ? orderNamesToOrderInfos(options.orderBy) : undefined,
    joins: options.joins || [],
    first: options.first,
    last: options.last,
  }
}
export function createQueryBuilder<TEntity>(
  config: QueryBuilderConfig,
): SelectQueryBuilder<TEntity> {
  const conn = getConnection()
  const queryBuilder = conn.getRepository<TEntity>(config.entity).createQueryBuilder(config.alias)

  return populateQueryBuilder(queryBuilder, config)
}
