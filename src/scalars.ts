// https://www.apollographql.com/docs/graphql-tools/scalars/

import { GraphQLScalarType } from 'graphql'
import { Kind } from 'graphql/language'

export const GraphQLCustomDate = new GraphQLScalarType({
  name: 'Date',
  description: 'Date custom scalar type',
  parseValue(value) {
    return new Date(value)
  },
  serialize(value) {
    if (value instanceof Date) {
      return value.toISOString()
    } else if (typeof value === 'number' || typeof value === 'string') {
      return new Date(value)
    }
    return null
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.INT) {
      return new Date(ast.value)
    }
    return null
  },
})
