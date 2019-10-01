import { createConnection, getConnection, Connection } from 'typeorm'
import { entities } from '../entities'
import { QueriesCounterLogger } from '../../src/queries-counter-logger'

let logger: QueriesCounterLogger | undefined

export function resetLogger() {
  if (logger) {
    logger.reset()
  }
}

export function getDatabaseQueriesCount() {
  if (logger) {
    return logger.queries.length
  }

  return 0
}

let connection: Connection | undefined
export async function createTestConnectionSingleton() {
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

  return connection
}

export async function create<T>(entity: { new (): T }, content: Partial<T>): Promise<T> {
  const conn = getConnection()
  const newObject = new entity()

  Object.keys(content).forEach(key => {
    ;(newObject as any)[key] = (content as any)[key]
  })

  return conn.getRepository(entity).save(newObject)
}
