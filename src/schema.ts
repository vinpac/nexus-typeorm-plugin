import { makeExecutableSchema, IExecutableSchemaDefinition } from 'graphql-tools'
import { createSchemaBuilder } from './schema-builder'

export function buildSchema<TContext>(
  options?: Omit<IExecutableSchemaDefinition<TContext>, 'resolvers' | 'typeDefs'>,
) {
  const { resolversMap, typeDefs } = createSchemaBuilder()

  return makeExecutableSchema({
    ...options,
    resolvers: resolversMap as any,
    typeDefs,
  })
}
