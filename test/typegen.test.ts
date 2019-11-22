import { setupTest } from './utils'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('Typegen', () => {
  setupTest()
  test('Typegen snapshot', () => {
    const typegenText = readFileSync(
      resolve('test', '__generated__', 'nexus-typeorm-typegen.ts'),
      'utf8',
    )
    expect(typegenText).toMatchSnapshot()
  })
})
