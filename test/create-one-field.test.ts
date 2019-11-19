import { query, create, setupTest, getDatabaseQueriesCount } from './utils'
import { User, UserType } from './entities/user'
import { Post } from './entities/post'

describe('CRUD', () => {
  describe('Create One', () => {
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

    test('create one entity', async () => {
      const result = await query(`
        mutation {
          createOneUser(data: {
            name: "New John",
            age: 55
            type: NORMAL,
          }) {
            id
            name
            age
          }
        }`)

      expect(result).toMatchObject({
        createOneUser: {
          id: expect.any(String),
          age: 55,
          name: 'New John',
        },
      })
      // 1 for creation and 2 for transaction
      expect(getDatabaseQueriesCount()).toBe(3)
    })
    test('create two entities that have an 1:1 relation in one query', async () => {
      const result = await query(`
        mutation {
          createOneUser(data: {
            name: "Connected John",
            age: 55
            type: NORMAL,
            profile: {
              create: {
                slug: "connected-john"
                displayName: "Zoo"
              }
            }
          }) {
            id
            name
            age
            profile {
              slug
              displayName
            }
          }
        }`)

      const expectedUserObject = {
        id: expect.any(String),
        age: 55,
        name: 'Connected John',
        profile: {
          slug: 'connected-john',
          displayName: 'Zoo',
        },
      }

      expect(result).toMatchObject({
        createOneUser: expectedUserObject,
      })

      const userQuery = await query(
        `{
        user (where: { id: ${result!.createOneUser.id} }) {
          id
          age
          name
          profile {
            slug
            displayName
          }
        }
      }`,
      )

      expect(userQuery).toMatchObject({
        user: expectedUserObject,
      })
      // 1 START_TRANSACTION
      // 2. INSERT User
      // 3. INSERT UserProfile
      // 4. COMMIT_TRANSACTION
      // 5. User query to confirm data was saved
      expect(getDatabaseQueriesCount()).toBe(5)
    })

    test('create one entity and connect with one to many relation', async () => {
      const postsQuery = await query(`{ posts { id } }`)

      const result = await query(
        `
        mutation ($connect: PostWhereInput!) {
          createOneUser(data: {
            name: "John with posts",
            age: 42
            type: NORMAL,
            posts: {
              connect: $connect
            }
          }) {
            id
            name
            age
            posts {
              title
            }
          }
        }`,
        // eslint-disable-next-line @typescript-eslint/camelcase
        { connect: { id_in: postsQuery!.posts.map((post: any) => post.id) } },
      )

      expect(result).toMatchObject({
        createOneUser: {
          id: expect.any(String),
          age: 42,
          name: 'John with posts',
          posts: [
            {
              title: 'post 1',
            },
            {
              title: 'post 2',
            },
            {
              title: 'post 3',
            },
          ],
        },
      })

      // 1. Select posts
      // 2. START_TRANSACTION
      // 3. Select posts for connection
      // 4. Insert user
      // 5. Update post 1 TODO: JOIN These updates queries
      // 6. Update post 2
      // 7. Update post 3
      // 8. COMMIT_TRANSACTION
      expect(getDatabaseQueriesCount()).toBe(8)
    })

    test('create one entity connected with many to many relation', async () => {
      const result = await query(
        `
      mutation {
        createOneUser(data: {
          name: "John with posts",
          age: 42
          type: NORMAL,
          profile: {
            create: {
              slug: "john-with-posts",
              displayName: "displayName"
            }
          }
          posts: {
            create: [
              {
                title: "created post",
                isPublic: false,
                categories: {
                  create: [
                    {
                      name: "create category 1"
                    },
                    {
                      name: "create category 2"
                    }
                  ]
                }
              },
              {
                title: "created post 2",
                isPublic: true,
              }
            ]
          }
        }) {
          id
          name
          age
          profile {
            slug
            displayName
          }
          posts {
            title
            isPublic
            categories {
              name
            }
          }
        }
      }`,
      )

      expect(result).toMatchObject({
        createOneUser: {
          id: expect.any(String),
          age: 42,
          name: 'John with posts',
          profile: {
            slug: 'john-with-posts',
            displayName: 'displayName',
          },
          posts: [
            {
              title: 'created post 2',
              isPublic: true,
              categories: [],
            },
            {
              title: 'created post',
              isPublic: false,
              categories: [
                {
                  name: 'create category 1',
                },
                {
                  name: 'create category 2',
                },
              ],
            },
          ],
        },
      })

      // 1. START TRANSACTION
      // 2. Insert User
      // 3. Insert Category 1
      // 4. Insert Category 2
      // 5. Insert Post 1
      // 6. Insert UserProfile
      // 7. Insert Post 2
      // 8. Insert PostCategory Join table
      // 9. COMMIT TRANSACTION
      expect(getDatabaseQueriesCount()).toBe(9)
    })

    test('create one entity with many to one relation', async () => {
      const result = await query(
        `
      mutation {
        createOnePost(data: {
          title: "post created"
          isPublic: true
          user: {
            create: {
              name: "John with posts",
              age: 42
              type: NORMAL,
            }
          }
        }) {
          id
          title
          user {
            name
            age
            type
          }
        }
      }`,
      )

      expect(result).toMatchObject({
        createOnePost: {
          id: expect.any(String),
          title: 'post created',
          user: {
            age: 42,
            name: 'John with posts',
            type: 'NORMAL',
          },
        },
      })
    })

    test('create one entity and connect with many to one relation', async () => {
      const result = await query(
        `
      mutation {
        createOnePost(data: {
          title: "post created"
          isPublic: true
          user: {
            connect: { name: "Gina" }
          }
        }) {
          id
          title
          user {
            name
            age
            type
          }
        }
      }`,
      )

      expect(result).toMatchObject({
        createOnePost: {
          id: expect.any(String),
          title: 'post created',
          user: {
            age: 18,
            name: 'Gina',
            type: 'NORMAL',
          },
        },
      })
    })

    test('create one entity and connect with many to many relation', async () => {
      const result = await query(
        `
      mutation {
        createOneCategory(data: {
          name: "category created"
          posts: {
            connect: { title: "post 1" }
          }
        }) {
          id
          name
          posts {
            title
          }
        }
      }`,
      )

      expect(result).toMatchObject({
        createOneCategory: {
          id: expect.any(String),
          name: 'category created',
          posts: [
            {
              title: 'post 1',
            },
          ],
        },
      })
      // 1. START TRANSACTION
      // 2. Select connected posts
      // 3. Inset category
      // 4. Inset Post-Category relation join table
      // 5. COMMIT TRANSACTION
      expect(getDatabaseQueriesCount()).toBe(5)
    })
  })
})
