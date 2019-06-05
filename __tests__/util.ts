import * as dotenv from 'dotenv'
import { graphql, GraphQLSchema } from 'graphql'
import { Connection, createConnection, getConnection } from 'typeorm'

import { buildExecutableSchema } from '@/schema'

import { Post } from './entities/post'
import { User } from './entities/user'
import { UserLikesPost } from './entities/user-likes-post'

let conn: Connection | undefined
export let schema: GraphQLSchema | undefined

export function setupTest() {
  dotenv.config()

  beforeAll(async () => {
    const entities = [
      User,
      Post,
      UserLikesPost,
    ]

    if (!conn) {
      conn = await createConnection({
        database: process.env.TEST_DB_NAME,
        entities,
        host: process.env.TEST_DB_HOST,
        port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
        type: process.env.TEST_DB_TYPE as any,
        username: process.env.TEST_DB_USERNAME,
      })
    }

    if (!schema) {
      schema = buildExecutableSchema({
        entities,
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

export async function create<T>(entity: { new(): T }, content: Partial<T>): Promise<T> {
  const conn = getConnection()
  const newObject = new entity()

  Object.keys(content).forEach(key => {
    (newObject as any)[key] = (content as any)[key]
  })

  return conn.getRepository(entity).save(newObject)
}

export async function query(queryString: string, variables?: {[key: string]: any}) {
  if (schema) {
    return graphql(
      schema,
      queryString,
      undefined,
      undefined,
      variables,
    )
  }
  throw new Error('GraphQL schema is not ready!')
}
