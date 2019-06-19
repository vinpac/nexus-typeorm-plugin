import * as TypeORM from 'typeorm'
import { GraphQLEnumTypeConfig, GraphQLEnumType } from 'graphql'

import { SchemaInfo } from './schema'

const orderTypes = ['ASC', 'DESC']

export interface OrderInfo {
  propertyName: string
  type: 'ASC' | 'DESC'
}

export function orderNamesToOrderInfos(orderNames: string[]): OrderInfo[] {
  return orderNames.reduce<OrderInfo[]>((result, orderName) => {
    const splitted = orderName.split('_')
    const { length } = splitted
    if (length > 0) {
      const type = splitted[splitted.length - 1]
      if (type === 'ASC' || type === 'DESC') {
        result.push({
          propertyName: splitted.slice(0, length - 1).join('_'),
          type,
        })
      }
    }

    return result
  }, [])
}

export function createOrderByInput(schemaInfo: SchemaInfo, entity: any): GraphQLEnumType {
  const conn = TypeORM.getConnection()
  const typeormMetadata = conn.getMetadata(entity)
  const { name } = typeormMetadata

  if (name in schemaInfo.orderByInputTypes) {
    return schemaInfo.orderByInputTypes[name]
  }

  const config: GraphQLEnumTypeConfig = {
    name: `${name}OrderByInput`,
    values: {},
  }

  typeormMetadata.columns.forEach(column => {
    orderTypes.forEach(orderType => {
      const orderName = `${column.propertyName}_${orderType}`
      config.values[orderName] = {
        value: orderName,
      }
    })
  })

  const type = new GraphQLEnumType(config)
  schemaInfo.orderByInputTypes[name] = type

  return type
}
