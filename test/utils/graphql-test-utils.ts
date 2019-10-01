import { GraphQLSchema, graphql } from 'graphql'
import { buildSchema } from 'src/index'

export let schema: GraphQLSchema | undefined
export function createTestSchemaSingleton() {
  if (!schema) {
    schema = buildSchema()
  }

  return schema
}

export async function query(
  queryString: string,
  variables?: { [key: string]: any },
  context?: object,
) {
  if (schema) {
    return graphql(schema, queryString, undefined, context, variables)
  }

  throw new Error('GraphQL schema is not ready!')
}
