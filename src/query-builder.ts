import { TranslatedWhere } from './args/arg-where'
import { getConnection } from 'typeorm'
import { OrderInfo } from './args/arg-order-by'
import { getEntityTypeName } from './util'

interface FindEntitiesOptions {
  entity: Function
  first?: number
  last?: number
  where?: TranslatedWhere
  orders?: OrderInfo[]
  join?: string[]
}
export function createQueryBuilder<Model>(options: FindEntitiesOptions) {
  const { entity } = options
  const connection = getConnection()
  const entityTypeName = getEntityTypeName(entity)
  const queryBuilder = connection.getRepository<Model>(entity).createQueryBuilder()

  if (options.first !== undefined) {
    queryBuilder.take(options.first)
  } else if (options.last !== undefined) {
    queryBuilder.take(options.last)
  }

  if (options.where) {
    queryBuilder.where(options.where.expression, options.where.params)
  }

  if (options.join) {
    options.join.forEach(propertyPath => {
      const propertyPathPieces = propertyPath.split('.')
      queryBuilder.leftJoinAndSelect(
        propertyPathPieces.length > 1
          ? `${propertyPathPieces.slice(0, propertyPathPieces.length - 1).join('_')}.${
              propertyPathPieces[propertyPathPieces.length - 1]
            }`
          : `${entityTypeName}.${propertyPath}`,
        propertyPath.replace(/\./g, '_'),
      )
    })
  }

  const ordersWithDepth: {
    alias: string
    depth: number
    order: OrderInfo
  }[] =
    (options.orders &&
      options.orders.map(order => ({
        alias: entityTypeName,
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
