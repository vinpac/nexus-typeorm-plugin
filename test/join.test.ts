import { User } from './entities/user'
import { Post } from './entities/post'
import { query, setupTest, create, resetLogger, getDatabaseQueriesCount } from './utils'
import { UserLikesPost } from './entities/user-likes-post'

describe('Where', () => {
  setupTest()

  async function setupFixture() {
    const userFoo = await create(User, { age: 20, name: 'foo' })
    const userBar = await create(User, { age: 30, name: 'bar' })
    const userBaz = await create(User, { age: 40, name: 'baz' })
    const userQuz = await create(User, { age: 50, name: 'quz' })
    const fooPost1 = await create(Post, { user: userFoo, title: 'foo post' })
    const fooPost2 = await create(Post, { user: userFoo, title: 'foo post 2' })
    const barPost = await create(Post, { user: userBar, title: 'bar post' })

    await create(UserLikesPost, { user: userQuz, post: fooPost1 })
    await create(UserLikesPost, { user: userBar, post: fooPost1 })
    await create(UserLikesPost, { user: userBaz, post: fooPost2 })
    await create(UserLikesPost, { user: userFoo, post: barPost })
    resetLogger()
  }

  beforeEach(async () => {
    await setupFixture()
  })

  it("should fetch user's posts in one query", async () => {
    expect(getDatabaseQueriesCount()).toBe(0)
    const result = await query(`{
      user (where: { name: "foo" }, join: ["posts"]) {
        name
        posts (first: 10) {
          title
        }
      }
    }`)

    expect(result.errors).toEqual(undefined)
    expect(result.data).toMatchObject({
      user: {
        name: 'foo',
        posts: [
          {
            title: 'foo post',
          },
          {
            title: 'foo post 2',
          },
        ],
      },
    })
    expect(getDatabaseQueriesCount()).toBe(1)
  })

  it('handles join on pagination field', async () => {
    const result = await query(`
      query {
        users(join: ["posts"]) {
          id
          name
          posts {
            id
            title
          }
        }
      }
    `)

    expect(getDatabaseQueriesCount()).toBe(1)
    expect(result.errors).toBe(undefined)
    expect(result.data).toMatchObject({
      users: expect.arrayContaining([
        {
          id: expect.any(String),
          name: 'foo',
          posts: [
            {
              id: expect.any(String),
              title: 'foo post',
            },
            {
              id: expect.any(String),
              title: 'foo post 2',
            },
          ],
        },
        {
          id: expect.any(String),
          name: 'bar',
          posts: [
            {
              id: expect.any(String),
              title: 'bar post',
            },
          ],
        },
        {
          id: expect.any(String),
          name: 'baz',
          posts: [],
        },
        {
          id: expect.any(String),
          name: 'quz',
          posts: [],
        },
      ]),
    })
  })

  it('handles join on pagination field', async () => {
    const result = await query(`
      query {
        users(join: ["posts"]) {
          id
          name
          posts {
            id
            title
          }
        }
      }
    `)

    expect(getDatabaseQueriesCount()).toBe(1)
    expect(result.errors).toBe(undefined)
    expect(result.data).toMatchObject({
      users: expect.arrayContaining([
        {
          id: expect.any(String),
          name: 'foo',
          posts: expect.arrayContaining([
            {
              id: expect.any(String),
              title: 'foo post',
            },
            {
              id: expect.any(String),
              title: 'foo post 2',
            },
          ]),
        },
        {
          id: expect.any(String),
          name: 'bar',
          posts: [
            {
              id: expect.any(String),
              title: 'bar post',
            },
          ],
        },
        {
          id: expect.any(String),
          name: 'baz',
          posts: [],
        },
        {
          id: expect.any(String),
          name: 'quz',
          posts: [],
        },
      ]),
    })
  })

  it('handles join on nested pagination field', async () => {
    const result = await query(`
      query {
        users(join: ["posts", "posts.userLikesPosts", "posts.userLikesPosts.user"]) {
          id
          name
          posts {
            id
            title
            userLikesPosts {
              user {
                name
              }
            }
          }
        }
      }
    `)

    expect(result.errors).toBe(undefined)
    expect(getDatabaseQueriesCount()).toBe(1)
    expect(result.data).toMatchObject({
      users: expect.arrayContaining([
        {
          id: expect.any(String),
          name: 'foo',
          posts: [
            {
              id: expect.any(String),
              title: 'foo post',
              userLikesPosts: expect.arrayContaining([
                {
                  user: {
                    name: 'quz',
                  },
                },
                {
                  user: {
                    name: 'bar',
                  },
                },
              ]),
            },
            {
              id: expect.any(String),
              title: 'foo post 2',
              userLikesPosts: expect.arrayContaining([
                {
                  user: {
                    name: 'baz',
                  },
                },
              ]),
            },
          ],
        },
        {
          id: expect.any(String),
          name: 'bar',
          posts: [
            {
              id: expect.any(String),
              title: 'bar post',
              userLikesPosts: expect.arrayContaining([
                {
                  user: {
                    name: 'foo',
                  },
                },
              ]),
            },
          ],
        },
        {
          id: expect.any(String),
          name: 'baz',
          posts: [],
        },
        {
          id: expect.any(String),
          name: 'quz',
          posts: [],
        },
      ]),
    })
  })

  it('should throw an error on a ignored join on pagination field', async () => {
    const result = await query(`
      query {
        users(join: ["posts", "posts.userLikesPosts"]) {
          id
          name
          posts (join: ["userLikesPosts"]) {
            id
            title
            userLikesPosts {
              user {
                name
              }
            }
          }
        }
      }
    `)

    expect(result.errors![0].message).toBe(
      'Join argument is ignored here because a this field was already joined',
    )
  })

  it('should throw an error on ignored join on unique field', async () => {
    const result = await query(`
      query {
        users(join: ["posts", "posts.userLikesPosts", "posts.userLikesPosts.user"]) {
          id
          name
          posts {
            id
            title
            userLikesPosts (join: ["user"]) {
              user {
                name
              }
            }
          }
        }
      }
    `)

    expect(result.errors![0].message).toBe(
      'Join argument is ignored here because a this field was already joined',
    )
  })
})
