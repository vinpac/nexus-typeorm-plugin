import * as dotenv from 'dotenv'
import { graphql, GraphQLSchema } from 'graphql'
import { buildSchema } from 'type-graphql'
import { Connection, createConnection } from 'typeorm'

import { Post } from './entities/post'
import { User } from './entities/user'
import { PostResolver } from './resolvers/post'
import { UserResolver } from './resolvers/user'

let conn: Connection | undefined
export let schema: GraphQLSchema | undefined

export function setupTest() {
  dotenv.config()

  beforeAll(async () => {
    if (!conn) {
      conn = await createConnection({
        database: process.env.TEST_DB_NAME,
        entities: [
          User,
          Post,
        ],
        host: process.env.TEST_DB_HOST,
        port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
        type: process.env.TEST_DB_TYPE as any,
        username: process.env.TEST_DB_USERNAME,
      })
    }

    if (!schema) {
      schema = await buildSchema({
        resolvers: [
          UserResolver,
          PostResolver,
        ],
      })
    }
  })

  beforeEach(async () => {
    if (conn) {
      await conn.synchronize(true)
    }
  })

  afterAll(async () => {
    if (conn) {
      await conn.close()
    }
  })
}

export async function query(queryString: string) {
  if (schema) {
    return graphql(schema, queryString)
  }
  throw new Error('GraphQL schema is not ready!')
}
