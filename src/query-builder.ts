import { TranslatedWhere } from './args/arg-where'
import { getConnection, SelectQueryBuilder } from 'typeorm'
import { OrderInfo } from './args/arg-order-by'
import { getEntityTypeName } from './util'
import { RelationMetadata } from 'typeorm/metadata/RelationMetadata'
import { SchemaBuilder } from './schema-builder'

export interface EntityJoin {
  propertyPath: string
  first?: number
  last?: number
  where?: TranslatedWhere
  orders?: OrderInfo[]
  relation: RelationMetadata
}

interface QueryBuilderConfig {
  entity: Function
  first?: number
  last?: number
  where?: TranslatedWhere
  orders?: OrderInfo[]
  join?: EntityJoin[]
}

function populateQueryBuilder<Model>(
  queryBuilder: SelectQueryBuilder<Model>,
  // Schema Builder will be used in a next version to allow
  // deep auto joins
  _: SchemaBuilder,
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

  queryBuilder
  if (config.join) {
    config.join.forEach(({ propertyPath }) => {
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

  return queryBuilder
}

export function createQueryBuilder<Model>(
  schemaBuilder: SchemaBuilder,
  config: QueryBuilderConfig,
): SelectQueryBuilder<Model> {
  const conn = getConnection()
  const queryBuilder = conn.getRepository<Model>(config.entity).createQueryBuilder()

  return populateQueryBuilder(queryBuilder, schemaBuilder, config)
}
