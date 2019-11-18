import { TranslatedWhere } from './args/arg-where'
import { getConnection, SelectQueryBuilder } from 'typeorm'
import { OrderInfo } from './args/arg-order-by'
import { getEntityTypeName } from './util'

export interface EntityJoin {
  type: 'inner' | 'left'
  propertyPath: string
  where?: TranslatedWhere
  select?: boolean
}

export interface QueryBuilderConfig {
  entity: Function
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
  const entityTypeName = getEntityTypeName(config.entity)

  if (config.first !== undefined) {
    queryBuilder.take(config.first)
  } else if (config.last !== undefined) {
    queryBuilder.take(config.last)
  }

  if (config.where) {
    queryBuilder.where(config.where.expression, config.where.params)
  }

  const ordersWithDepth: {
    alias: string
    depth: number
    order: OrderInfo
  }[] =
    (config.orders &&
      config.orders.map(order => ({
        alias: entityTypeName,
        depth: 0,
        order,
      }))) ||
    []

  if (ordersWithDepth.length) {
    const sortedOrdersWithDepth = ordersWithDepth.sort((a, b) => a.depth - b.depth)

    sortedOrdersWithDepth.forEach(order =>
      queryBuilder.addOrderBy(`${order.alias}.${order.order.propertyName}`, order.order.type),
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
          : `${entityTypeName}.${join.propertyPath}`,
        propertyPathToAlias(join.propertyPath),
        join.where && join.where.expression,
        join.where && join.where.params,
      )
    })
  }

  return queryBuilder
}

export function createQueryBuilder<Model>(config: QueryBuilderConfig): SelectQueryBuilder<Model> {
  const conn = getConnection()
  const queryBuilder = conn.getRepository<Model>(config.entity).createQueryBuilder()

  return populateQueryBuilder(queryBuilder, config)
}
