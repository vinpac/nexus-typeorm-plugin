import { query, create, setupTest, getDatabaseQueriesCount } from './utils'
import { User, UserType } from './entities/user'
import { Post } from './entities/post'

describe('CRUD', () => {
  describe('Update One', () => {
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

    test('update one entity', async () => {
      const result = await query(`
        mutation {
          updateOneUser(data: {
            name: "Updated Jack"
            age: 55
          }, where: { name: "Jack", }) {
            id
            name
            age
          }
          updateOnePost(data: {
            title: "post updated"
          }, where: { title: "post 1", }) {
            id
            title
          }
        }`)

      expect(result).toMatchObject({
        updateOneUser: {
          id: expect.any(String),
          age: 55,
          name: 'Updated Jack',
        },
        updateOnePost: {
          id: expect.any(String),
          title: 'post updated',
        },
      })

      // 1. SELECT  |
      // 2. UPDATE  |
      // 3. SELECT  | x2
      expect(getDatabaseQueriesCount()).toBe(6)
    })
  })
})
