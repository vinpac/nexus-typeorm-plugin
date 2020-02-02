import { enumType } from 'nexus/dist/core'

export const orderTypes = ['ASC', 'DESC'] as const

export type ArgOrderType = { [index: string]: typeof orderTypes[number] }

export interface OrderInfo {
  propertyName: string
  type: typeof orderTypes[number]
}

export const translateOrderClause = (orderByProperties: ArgOrderType): OrderInfo[] => {
  return Object.keys(orderByProperties).map(propertyName => ({
    propertyName,
    type: orderByProperties[propertyName],
  }))
}

export const OrderByArgument = enumType({
  name: 'OrderByArgument',
  members: orderTypes.reduce((object, value) => ({ ...object, [value]: value }), {}),
})
