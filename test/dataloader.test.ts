import { Post } from './entities/post'
import { User, UserType } from './entities/user'
import { query, setupTest, create, resetLogger, getDatabaseQueriesCount } from './utils'
import { createORMContext } from '../src/dataloader/entity-dataloader'

describe('UniqueField', () => {
  setupTest()

  beforeEach(async () => {
    const Jeong = await create<User>(User, {
      age: 3,
      name: 'Jeong',
      type: UserType.NORMAL,
    })
    const Jana = await create<User>(User, {
      age: 3,
      name: 'Jana',
      type: UserType.NORMAL,
    })
    const John = await create<User>(User, {
      age: 3,
      name: 'John',
      type: UserType.NORMAL,
    })
    await create(Post, {
      user: Jeong,
      title: 'hello 1',
    })
    await create(Post, {
      user: Jana,
      title: 'hello 2',
    })
    await create(Post, {
      user: John,
      title: 'hello 3',
    })
    resetLogger()
  })

  it('should fetch unique field deep relations with dataloaders', async () => {
    expect(getDatabaseQueriesCount()).toBe(0)
    const result = await query(
      `{
        post (where: { title: "hello 1" }) {
          title
          user {
            name
            posts {
              title
              user {
                name
                posts {
                  title
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
        title: 'hello 1',
        user: {
          name: 'Jeong',
          posts: [
            {
              title: 'hello 1',
              user: {
                name: 'Jeong',
                posts: [
                  {
                    title: 'hello 1',
                  },
                ],
              },
            },
          ],
        },
      },
    })
    expect(getDatabaseQueriesCount()).toBe(3)
  })

  it('should fetch pagination field deep relations with dataloaders', async () => {
    expect(getDatabaseQueriesCount()).toBe(0)
    const result = await query(
      `{
        posts {
          title
          user {
            name
            posts {
              title
              user {
                name
                posts {
                  title
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
      posts: [
        {
          title: 'hello 1',
          user: {
            name: 'Jeong',
            posts: [
              {
                title: 'hello 1',
                user: {
                  name: 'Jeong',
                  posts: [
                    {
                      title: 'hello 1',
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          title: 'hello 2',
          user: {
            name: 'Jana',
            posts: [
              {
                title: 'hello 2',
                user: {
                  name: 'Jana',
                  posts: [
                    {
                      title: 'hello 2',
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          title: 'hello 3',
          user: {
            posts: [
              {
                title: 'hello 3',
                user: {
                  name: 'John',
                  posts: [
                    {
                      title: 'hello 3',
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    })
    expect(getDatabaseQueriesCount()).toBe(5)
  })
})
