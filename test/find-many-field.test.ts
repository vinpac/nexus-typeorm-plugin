import { query, create, setupTest, getDatabaseQueriesCount } from './utils'
import { User, UserType } from './entities/user'
import { Post } from './entities/post'

describe('CRUD', () => {
  describe('Find Many', () => {
    setupTest(async () => {
      const gina = await create<User>(User, {
        age: 18,
        name: 'Gina',
        type: UserType.NORMAL,
      })
      await create<User>(User, {
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
        user: gina,
        title: 'post 2',
      })
      await create(Post, {
        user: jack,
        title: 'post 3',
      })
      await create(Post, {
        user: gina,
        title: 'post 4',
      })
    })

    test('find many entities', async () => {
      const result = await query(`{
        users {
          id
          name
          age
        }
      }`)

      expect(result).toMatchObject({
        users: expect.arrayContaining([
          {
            id: expect.any(String),
            age: 18,
            name: 'Gina',
          },
          {
            id: expect.any(String),
            age: 32,
            name: 'John',
          },
          {
            id: expect.any(String),
            age: 24,
            name: 'Jack',
          },
        ]),
      })
      expect(getDatabaseQueriesCount()).toBe(1)
    })

    test('find many entities with where argument', async () => {
      const result = await query(`{
        greaterThan24: users(where: { age_gte: 24 }) {
          id
          name
          age
        }
        lastThan24: users(where: { age_lt: 24 }) {
          id
          name
          age
        }
      }`)

      expect(result).toMatchObject({
        greaterThan24: expect.arrayContaining([
          {
            id: expect.any(String),
            age: 32,
            name: 'John',
          },
          {
            id: expect.any(String),
            age: 24,
            name: 'Jack',
          },
        ]),
        lastThan24: [
          {
            id: expect.any(String),
            age: 18,
            name: 'Gina',
          },
        ],
      })
      expect(getDatabaseQueriesCount()).toBe(2)
    })

    test('find many entities by relation', async () => {
      const result = await query(`{
        user (where: { name: "Gina" }) {
          name
          posts {
            title
          }
        }
      }`)
      expect(result).toMatchObject({
        user: {
          name: 'Gina',
          posts: expect.arrayContaining([
            {
              title: 'post 1',
            },
            {
              title: 'post 2',
            },
            {
              title: 'post 4',
            },
          ]),
        },
      })
      expect(getDatabaseQueriesCount()).toBe(1)
    })

    test('find many entities with ordering', async () => {
      const result = await query(`{
        ageDesc: users(orderBy: age_DESC) {
          name
        }
        ageAsc: users(orderBy: age_ASC) {
          name
        }
      }`)
      expect(result).toMatchObject({
        ageAsc: [
          {
            name: 'Gina',
          },
          {
            name: 'Jack',
          },
          {
            name: 'John',
          },
        ],
        ageDesc: [
          {
            name: 'John',
          },
          {
            name: 'Jack',
          },
          {
            name: 'Gina',
          },
        ],
      })
      expect(getDatabaseQueriesCount()).toBe(2)
    })
  })
})
