import { query, create, setupTest, getDatabaseQueriesCount } from './utils'
import { User, UserType } from './entities/user'
import { Post } from './entities/post'

describe('CRUD', () => {
  describe('Find One', () => {
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

    test('find one entity', async () => {
      const result = await query(`{
        user {
          id
          name
          age
        }
      }`)

      expect(result).toMatchObject({
        user: {
          age: 18,
          id: expect.any(String),
          name: 'Gina',
        },
      })
      expect(getDatabaseQueriesCount()).toBe(1)
    })
    test('find one entity with where argument', async () => {
      const result = await query(`{
        john: user(where: { name:  "John" }) {
          name
        }
        jack: user(where: { name: "Jack"  }) {
          name
        }
      }`)
      expect(result).toMatchObject({
        john: {
          name: 'John',
        },
        jack: {
          name: 'Jack',
        },
      })
      expect(getDatabaseQueriesCount()).toBe(2)
    })

    // This test feels impossible. How can I ensure ONE entity from a relation ?

    // test('find one entity by relation', async () => {
    //   const users = await query(`{
    //     gina: user(where: { name: "Gina"  }) { id }
    //     john: user(where: { name: "John"  }) { id }
    //   }`)

    //   const result = await query(`{
    //     post1: post(where: { userId: ${users!.gina.id} }) {
    //       title
    //       user {
    //         name
    //       }
    //     }
    //     post2: post(where: { userId:  ${users!.john.id} }) {
    //       title
    //       user {
    //         name
    //       }
    //     }
    //   }`)
    //   expect(result).toMatchObject({
    //     post1: {
    //       title: 'post 1',
    //       user: {
    //         name: 'Gina',
    //       },
    //     },
    //     post2: {
    //       title: 'post 2',
    //       user: {
    //         name: 'John',
    //       },
    //     },
    //   })
    //   expect(getDatabaseQueriesCount()).toBe(4)
    // })
  })
})
