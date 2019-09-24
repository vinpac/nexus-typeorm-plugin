import { GraphQLScalarType, Kind } from 'graphql'

export const GraphQLID = new GraphQLScalarType({
  name: 'ID',
  description: 'Primary key',
  parseValue(value) {
    return String(value)
  },
  serialize(value) {
    return value
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return ast.value
    }

    return null
  },
})
