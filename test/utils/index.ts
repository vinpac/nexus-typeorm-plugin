import * as dotenv from 'dotenv'
import { createTestConnectionSingleton, resetLogger } from './database-test-utils'
import { createTestSchemaSingleton } from './graphql-test-utils'
import { getConnection } from 'typeorm'

dotenv.config()

export function setupTest(beforeEachFn?: () => any) {
  beforeAll(async () => {
    await createTestConnectionSingleton()
    await createTestSchemaSingleton()
    // Reset logger counter
    resetLogger()
  })

  beforeEach(async () => {
    try {
      await getConnection().synchronize(true)
    } catch (error) {
      error.name = `SynchronizeErrorAtSetupTest(${error.name})`
      throw error
    }

    if (beforeEachFn) {
      await beforeEachFn()
    }

    // Reset logger counter
    resetLogger()
  })

  afterAll(async () => {
    return getConnection().close()
  })
}

export * from './graphql-test-utils'
export * from './database-test-utils'
