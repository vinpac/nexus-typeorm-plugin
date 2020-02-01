import { query, create, setupTest, getDatabaseQueriesCount } from './utils'
import { User, UserType } from './entities/user'
import { Post } from './entities/post'
import { UserProfile } from './entities/user-profile'
import { Category } from './entities/category'

describe('CRUD', () => {
  describe('Relations', () => {
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
      await create(UserProfile, {
        user: gina,
        slug: 'gina',
        displayName: 'Gina',
      })
      const post1 = await create(Post, {
        user: john,
        title: 'post 1',
      })
      const post2 = await create(Post, {
        user: gina,
        title: 'post 2',
      })
      await create(Category, {
        name: 'foo',
        posts: [post2],
      })
      await create(Category, {
        name: 'zoo',
        posts: [post1],
      })
      await create(Category, {
        name: 'bar',
        posts: [post2],
      })
    })

    test('one to one', async () => {
      const result = await query(`{
        user (where: { name:  "Gina"}) {
          name
          profile {
            slug
          }
        }
      }`)

      expect(result).toMatchObject({
        user: {
          name: 'Gina',
          profile: {
            slug: 'gina',
          },
        },
      })
      expect(getDatabaseQueriesCount()).toBe(1)
    })

    test('one to many', async () => {
      const result = await query(`{
        user (where: { name:  "Gina" }) {
          name
          posts {
            title
          }
        }
      }`)

      expect(result).toMatchObject({
        user: {
          name: 'Gina',
          posts: [
            {
              title: 'post 2',
            },
          ],
        },
      })
      expect(getDatabaseQueriesCount()).toBe(1)
    })

    test('one to many with filters', async () => {
      const result = await query(`{
        user (where: { name:"Gina" }) {
          name
          posts (first: 10) {
            title
          }
        }
      }`)

      expect(result).toMatchObject({
        user: {
          name: 'Gina',
          posts: [
            {
              title: 'post 2',
            },
          ],
        },
      })
      expect(getDatabaseQueriesCount()).toBe(2)
    })

    test('many to one', async () => {
      const result = await query(`{
        post (where: { title : "post 2" }) {
          title
          user {
            name
          }
        }
      }`)

      expect(result).toMatchObject({
        post: {
          title: 'post 2',
          user: { name: 'Gina' },
        },
      })
      expect(getDatabaseQueriesCount()).toBe(1)
    })

    test('many to many', async () => {
      const result = await query(`{
        post1: post(where: { title: "post 1" }) {
          title
          categories {
            name
          }
        }
        post2: post(where: { title: "post 2" }) {
          title
          categories {
            name
          }
        }
      }`)

      expect(result).toMatchObject({
        post1: {
          title: 'post 1',
          categories: [
            {
              name: 'zoo',
            },
          ],
        },
        post2: {
          title: 'post 2',
          categories: [
            {
              name: 'foo',
            },
            {
              name: 'bar',
            },
          ],
        },
      })
      expect(getDatabaseQueriesCount()).toBe(2)
    })

    test('many to many with filters', async () => {
      const result = await query(`{
        post(where: { title: "post 2" }) {
          title
          categories (orderBy: { name : ASC}) {
            name
          }
        }
        postCategoriesFoo: post(where: { title:  "post 2" }) {
          title
          categories (where: { name: { equals : "foo"} }, orderBy: { name : ASC }) {
            name
          }
        }
      }`)

      expect(result).toMatchObject({
        post: {
          title: 'post 2',
          categories: [
            {
              name: 'bar',
            },
            {
              name: 'foo',
            },
          ],
        },
        postCategoriesFoo: {
          title: 'post 2',
          categories: [
            {
              name: 'foo',
            },
          ],
        },
      })
      expect(getDatabaseQueriesCount()).toBe(4)
    })
  })
})
