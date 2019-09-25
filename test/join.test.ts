import { User } from './entities/user'
import { Post } from './entities/post'
import { query, setupTest, create } from './utils'
import { getConnection } from 'typeorm'
import { QueriesCounterLogger } from 'src/queries-counter-logger'
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
  }

  beforeEach(async () => {
    await setupFixture()
  })

  it("should fetch user's posts in one query", async () => {
    const logger = getConnection().logger as QueriesCounterLogger
    logger.reset()
    expect(logger.queries).toHaveLength(0)
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
    expect(logger.queries).toHaveLength(1)
  })

  it('handles join on pagination field', async () => {
    const logger = getConnection().logger as QueriesCounterLogger
    logger.reset()
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

    expect(result.errors).toBe(undefined)
    expect(result.data).toMatchObject({
      users: expect.arrayContaining([
        {
          id: expect.any(Number),
          name: 'foo',
          posts: [
            {
              id: expect.any(Number),
              title: 'foo post',
            },
            {
              id: expect.any(Number),
              title: 'foo post 2',
            },
          ],
        },
        {
          id: expect.any(Number),
          name: 'bar',
          posts: [
            {
              id: expect.any(Number),
              title: 'bar post',
            },
          ],
        },
        {
          id: expect.any(Number),
          name: 'baz',
          posts: [],
        },
        {
          id: expect.any(Number),
          name: 'quz',
          posts: [],
        },
      ]),
    })
  })

  it('handles join on pagination field', async () => {
    const logger = getConnection().logger as QueriesCounterLogger
    logger.reset()
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

    expect(result.errors).toBe(undefined)
    expect(result.data).toMatchObject({
      users: expect.arrayContaining([
        {
          id: expect.any(Number),
          name: 'foo',
          posts: expect.arrayContaining([
            {
              id: expect.any(Number),
              title: 'foo post',
            },
            {
              id: expect.any(Number),
              title: 'foo post 2',
            },
          ]),
        },
        {
          id: expect.any(Number),
          name: 'bar',
          posts: [
            {
              id: expect.any(Number),
              title: 'bar post',
            },
          ],
        },
        {
          id: expect.any(Number),
          name: 'baz',
          posts: [],
        },
        {
          id: expect.any(Number),
          name: 'quz',
          posts: [],
        },
      ]),
    })
  })

  it('handles join on nested pagination field', async () => {
    const logger = getConnection().logger as QueriesCounterLogger
    logger.reset()
    const result = await query(`
      query {
        users(join: ["posts", "posts.userLikesPosts"]) {
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
    expect(result.data).toMatchObject({
      users: expect.arrayContaining([
        {
          id: expect.any(Number),
          name: 'foo',
          posts: [
            {
              id: expect.any(Number),
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
              id: expect.any(Number),
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
          id: expect.any(Number),
          name: 'bar',
          posts: [
            {
              id: expect.any(Number),
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
          id: expect.any(Number),
          name: 'baz',
          posts: [],
        },
        {
          id: expect.any(Number),
          name: 'quz',
          posts: [],
        },
      ]),
    })
  })
})
