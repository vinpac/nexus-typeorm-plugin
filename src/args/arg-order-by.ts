import * as TypeORM from 'typeorm'
import { SchemaBuilder } from '../schema-builder'
import { getEntityName } from '@/util'

const orderTypes = ['ASC', 'DESC']

export type ArgOrder = string[]

export interface OrderInfo {
  propertyName: string
  type: 'ASC' | 'DESC'
}

export function orderNamesToOrderInfos(orderNames: ArgOrder): OrderInfo[] {
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

export const createOrderByInputTypeDef = (
  entity: any,
  schemaBuilder: SchemaBuilder,
): SchemaBuilder => {
  const connection = TypeORM.getConnection()
  const entityName = getEntityName(entity)
  const entityMetadata = connection.getMetadata(entity)

  if (schemaBuilder.meta[entityName].orderByInputTypeName) {
    return schemaBuilder
  }

  const typeName = `${entityName}OrderByInput`
  let typeDefs = `enum ${typeName} {`
  entityMetadata.columns.forEach(column => {
    orderTypes.forEach(orderType => {
      typeDefs += `\n    ${column.propertyName}_${orderType}`
    })
  })
  typeDefs += '\n}'

  return {
    ...schemaBuilder,
    typeDefs: `${schemaBuilder.typeDefs}${typeDefs}`,
    meta: {
      ...schemaBuilder.meta,
      [entityName]: {
        ...schemaBuilder.meta[entityName],
        orderByInputTypeName: typeName,
      },
    },
  }
}
