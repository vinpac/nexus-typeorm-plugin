import { TranslatedWhere } from './args/arg-where'
import { getConnection } from 'typeorm'
import { OrderInfo } from './args/arg-order-by'
import { getDatabaseObjectMetadata } from './decorators'

interface FindEntitiesOptions {
  entity: Function
  first?: number
  last?: number
  where?: TranslatedWhere
  orders?: OrderInfo[]
}
export function createQueryBuilder<Model>(options: FindEntitiesOptions) {
  const { entity } = options
  const connection = getConnection()
  const { name } = getDatabaseObjectMetadata(options.entity)
  const queryBuilder = connection.getRepository<Model>(entity).createQueryBuilder()

  if (options.first !== undefined) {
    queryBuilder.take(options.first)
  } else if (options.last !== undefined) {
    queryBuilder.take(options.last)
  }

  if (options.where) {
    queryBuilder.where(options.where.expression, options.where.params)
  }

  const ordersWithDepth: {
    alias: string
    depth: number
    order: OrderInfo
  }[] =
    (options.orders &&
      options.orders.map(order => ({
        alias: name,
        depth: 0,
        order,
      }))) ||
    []

  if (ordersWithDepth.length) {
    const sortedOrdersWithDepth = ordersWithDepth.sort((a, b) => a.depth - b.depth)

    sortedOrdersWithDepth.forEach(order => {
      const {
        alias,
        order: { propertyName, type },
      } = order

      queryBuilder.addOrderBy(`${alias}.${propertyName}`, type)
    })
  }

  return queryBuilder
}
