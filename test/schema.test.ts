import { setupTest } from './utils'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('Schema', () => {
  setupTest()
  test('schema.grapqhl snapshot', () => {
    const schemaText = readFileSync(resolve('test', '__generated__', 'schema.graphql'), 'utf8')
    expect(schemaText).toMatchSnapshot()
  })
})
