import { Post } from './entities/post'
import { User, UserType } from './entities/user'
import { query, setupTest, create, resetLogger, getDatabaseQueriesCount } from './utils'
import { createORMContext } from 'src/dataloader/entity-dataloader'

describe('UniqueField', () => {
  setupTest()

  beforeEach(async () => {
    const user = await create<User>(User, {
      age: 3,
      name: 'Jeong',
      type: UserType.NORMAL,
    })
    const user2 = await create<User>(User, {
      age: 3,
      name: 'Foo',
      type: UserType.NORMAL,
    })
    await create(Post, {
      user,
      title: 'hello 1',
    })
    await create(Post, {
      user,
      title: 'hello 2',
    })
    await create(Post, {
      user: user2,
      title: 'hello 3',
    })
    resetLogger()
  })

  it("should fetch an user with name 'Jeong'", async () => {
    const result = await query(`{
      user (where: { name: "Jeong" }) {
        id
        name
        age
      }
    }`)

    expect(result.errors).toEqual(undefined)
    expect(result.data).toMatchObject({
      user: {
        age: 3,
        id: expect.any(Number),
        name: 'Jeong',
      },
    })
  })

  it("should fetch an post by it's userId", async () => {
    const userResult = await query(`{
      user (where: { name: "Jeong" }) {
        id
        name
        age
      }
    }`)

    const user: User = userResult.data!.user
    expect(user).toBeTruthy()
    const result = await query(`{
      post(where: { userId: ${user.id} }, orderBy: [createdAt_DESC]) {
        id
        title
      }
    }`)

    expect(result.errors).toEqual(undefined)
    expect(result.data).toMatchObject({
      post: {
        title: 'hello 2',
      },
    })
  })

  it("should fetch user's posts", async () => {
    const result = await query(`{
      user (where: { name: "Jeong" }) {
        id
        name
        age
        posts (first: 2) {
          id
          title
        }
      }
    }`)

    expect(result.errors).toEqual(undefined)
    expect(result.data).toMatchObject({
      user: {
        age: 3,
        id: expect.any(Number),
        name: 'Jeong',
        posts: [
          {
            id: expect.any(Number),
            title: 'hello 1',
          },
          {
            id: expect.any(Number),
            title: 'hello 2',
          },
        ],
      },
    })
  })

  it('should fetch deep relations', async () => {
    expect(getDatabaseQueriesCount()).toBe(0)
    const result = await query(`{
      post (where: { title: "hello 1" }) {
        id
        title
        user {
          id
          posts {
            id
            title
            user {
              id
            }
          }
        }
      }
    }`)

    expect(result.errors).toEqual(undefined)
    expect(result.data).toMatchObject({
      post: {
        id: expect.any(Number),
        title: 'hello 1',
        user: {
          id: expect.any(Number),
          posts: [
            {
              id: expect.any(Number),
              title: 'hello 1',
              user: {
                id: expect.any(Number),
              },
            },
            {
              id: expect.any(Number),
              title: 'hello 2',
              user: {
                id: expect.any(Number),
              },
            },
          ],
        },
      },
    })
    expect(getDatabaseQueriesCount()).toBe(5)
  })

  it('should fetch deep relations without dataloaders', async () => {
    expect(getDatabaseQueriesCount()).toBe(0)
    const result = await query(
      `{
      post (where: { title: "hello 1" }) {
        id
        title
        user {
          id
          posts {
            id
            title
            user {
              id
              posts {
                id
              }
            }
          }
        }
      }
    }`,
      {},
    )

    expect(result.errors).toEqual(undefined)
    expect(result.data).toMatchObject({
      post: {
        id: expect.any(Number),
        title: 'hello 1',
        user: {
          id: expect.any(Number),
          posts: [
            {
              id: expect.any(Number),
              title: 'hello 1',
              user: {
                id: expect.any(Number),
                posts: [
                  {
                    id: expect.any(Number),
                  },
                  {
                    id: expect.any(Number),
                  },
                ],
              },
            },
            {
              id: expect.any(Number),
              title: 'hello 2',
              user: {
                id: expect.any(Number),
                posts: [
                  {
                    id: expect.any(Number),
                  },
                  {
                    id: expect.any(Number),
                  },
                ],
              },
            },
          ],
        },
      },
    })
    // 2 Unique fields and 1 Pagination field
    expect(getDatabaseQueriesCount()).toBe(7)
  })

  it('should fetch deep relations with dataloaders', async () => {
    expect(getDatabaseQueriesCount()).toBe(0)
    const result = await query(
      `{
      post (where: { title: "hello 1" }) {
        id
        title
        user {
          id
          posts {
            id
            title
            user {
              id
              posts {
                id
              }
            }
          }
        }
      }
    }`,
      {},
      {
        // Using getDecoratedEntities() only for testing
        // In production you this wouldn't work if you set a diferent value for `entities` option
        // at `createSchemaShape`
        orm: createORMContext(),
      },
    )

    expect(result.errors).toEqual(undefined)
    expect(result.data).toMatchObject({
      post: {
        id: expect.any(Number),
        title: 'hello 1',
        user: {
          id: expect.any(Number),
          posts: [
            {
              id: expect.any(Number),
              title: 'hello 1',
              user: {
                id: expect.any(Number),
                posts: [
                  {
                    id: expect.any(Number),
                  },
                  {
                    id: expect.any(Number),
                  },
                ],
              },
            },
            {
              id: expect.any(Number),
              title: 'hello 2',
              user: {
                id: expect.any(Number),
                posts: [
                  {
                    id: expect.any(Number),
                  },
                  {
                    id: expect.any(Number),
                  },
                ],
              },
            },
          ],
        },
      },
    })
    // 2 Unique fields and 1 Pagination field
    expect(getDatabaseQueriesCount()).toBe(3)
  })
})
