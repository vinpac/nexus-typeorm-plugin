import { query, create, setupTest, getDatabaseQueriesCount } from './utils'
import { User, UserType } from './entities/user'
import { Post } from './entities/post'

describe('CRUD', () => {
  describe('Update Many', () => {
    setupTest(async () => {
      const gina = await create<User>(User, {
        age: 18,
        name: 'Gina',
        type: UserType.NORMAL,
      })
      const john = await create<User>(User, {
        age: 32,
        name: 'John',
        type: UserType.NORMAL,
      })
      const jack = await create<User>(User, {
        age: 24,
        name: 'Jack',
        type: UserType.NORMAL,
      })
      await create(Post, {
        user: gina,
        title: 'post 1',
      })
      await create(Post, {
        user: john,
        title: 'post 2',
      })
      await create(Post, {
        user: jack,
        title: 'post 3',
      })
    })

    test('update many entities', async () => {
      const mutation = await query(`
        mutation {
          updateManyUsers(data: {
            age: 55
          }, where: { age_lt: 32, }) {
            affectedRows
          }
        }`)
      const result = await query(`
        query {
          users {
            name
            age
        }
        }`)

      expect(mutation).toMatchObject({
        updateManyUsers: {
          affectedRows: 2,
        },
      })
      expect(result).toMatchObject({
        users: expect.arrayContaining([
          {
            name: 'Jack',
            age: 55,
          },
          {
            name: 'Gina',
            age: 55,
          },
          {
            name: 'John',
            age: 32,
          },
        ]),
      })
      // 1. UPDATE
      expect(getDatabaseQueriesCount()).toBe(2)
    })
  })
})
