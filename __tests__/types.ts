import { GraphQLScalarType, Kind } from 'graphql'

export interface TestContext {
  userId?: number
}

export const GraphQLTestBoolean = new GraphQLScalarType({
  name: 'TestBoolean',
  description: 'Test boolean custom scalar type',
  parseValue(value) {
    return Boolean(value)
  },
  serialize(value) {
    if (typeof value === 'boolean') {
      return value
    } else if (typeof value === 'number' || typeof value === 'string') {
      if (value === '0' || value === '') {
        return false
      }
      return Boolean(value)
    }
    return null
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.BOOLEAN) {
      return Boolean(ast.value)
    }
    return null
  },
})
