import * as dotenv from 'dotenv'
import { createTestConnectionSingleton, resetLogger } from './database-test-utils'
import { createTestSchemaSingleton } from './graphql-test-utils'
import { getConnection } from 'typeorm'

dotenv.config()

export function setupTest() {
  beforeAll(async () => {
    await createTestConnectionSingleton()
    await createTestSchemaSingleton()
  })

  beforeEach(async () => {
    await getConnection().synchronize(true)

    // Reset logger counter
    resetLogger()
  })

  afterAll(async () => {
    return getConnection().close()
  })
}

export * from './graphql-test-utils'
export * from './database-test-utils'
