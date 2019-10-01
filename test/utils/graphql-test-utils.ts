import * as dotenv from 'dotenv'
import { graphql, GraphQLSchema } from 'graphql'
import { Connection, createConnection, getConnection } from 'typeorm'
import { getTestSchema } from 'test/utils/schema-test-utils'
import { entities } from 'test/entities'
import { QueriesCounterLogger } from 'src/queries-counter-logger'

let connection: Connection | undefined
let logger: QueriesCounterLogger | undefined
export let schema: GraphQLSchema | undefined

export function setupTest() {
  dotenv.config()

  beforeAll(async () => {
    if (!logger) {
      logger = new QueriesCounterLogger()
    }

    if (!connection) {
      connection = await createConnection({
        database: process.env.TEST_DB_NAME,
        entities,
        host: process.env.TEST_DB_HOST,
        port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
        type: process.env.TEST_DB_TYPE as any,
        username: process.env.TEST_DB_USERNAME,
        ...(process.env.TEST_DB_PASSWORD && {
          password: process.env.TEST_DB_PASSWORD,
        }),
        logging: true,
        logger,
      })
    }

    if (!schema) {
      schema = getTestSchema()
    }
  })

  beforeEach(async () => {
    if (connection) {
      await connection.synchronize(true)
    }

    if (logger) {
      logger.reset()
    }
  })

  afterAll(async () => {
    if (connection) {
      await connection.close()
    }
  })
}

export function resetLogger() {
  if (logger) {
    logger.reset()
  }
}

export async function create<T>(entity: { new (): T }, content: Partial<T>): Promise<T> {
  const conn = getConnection()
  const newObject = new entity()

  Object.keys(content).forEach(key => {
    ;(newObject as any)[key] = (content as any)[key]
  })

  return conn.getRepository(entity).save(newObject)
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
