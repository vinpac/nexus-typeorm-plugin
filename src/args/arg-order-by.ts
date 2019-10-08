import { SchemaBuilder as NexusSchemaBuilder, enumType } from 'nexus/dist/core'
import { getConnection } from 'typeorm'
import { getEntityTypeName } from '../util'

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

export const createOrderByInputObjectType = (
  entity: any,
  nexusBuilder: NexusSchemaBuilder,
): string => {
  const { columns: entityColumns } = getConnection().getMetadata(entity)
  const typeName = `${getEntityTypeName(entity)}OrderByInput`
  const members: string[] = []
  entityColumns.forEach(column => {
    orderTypes.forEach(orderType => {
      members.push(`${column.propertyName}_${orderType}`)
    })
  })
  nexusBuilder.addType(
    enumType({
      name: typeName,
      members,
    }),
  )

  return typeName
}
