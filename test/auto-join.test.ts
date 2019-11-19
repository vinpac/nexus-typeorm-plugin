import { User } from './entities/user'
import { Post } from './entities/post'
import { query, setupTest, create, getDatabaseQueriesCount } from './utils'
import { UserLikesPost } from './entities/user-likes-post'

describe('Auto Join', () => {
  setupTest(async () => {
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
  })

  it("should auto join user's posts, fetching in one query", async () => {
    expect(getDatabaseQueriesCount()).toBe(0)
    const result = await query(`{
      post {
        title
      }
      user (where: { name: "foo" }) {
        name
        posts {
          title
        }
      }
    }`)

    expect(result).toMatchObject({
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
    expect(getDatabaseQueriesCount()).toBe(2)
  })

  it('should auto join on not joined relation', async () => {
    expect(getDatabaseQueriesCount()).toBe(0)
    const result = await query(`{
      user (where: { name: "foo" }) {
        name
        posts (first: 1) {
          title
          user {
            name
            posts {
              title
            }
          }
        }
      }
    }`)
    expect(result).toMatchObject({
      user: {
        name: 'foo',
        posts: [
          {
            title: 'foo post',
            user: {
              name: 'foo',
              posts: expect.arrayContaining([
                {
                  title: 'foo post',
                },
                {
                  title: 'foo post 2',
                },
              ]),
            },
          },
        ],
      },
    })

    // 1 query + 2 queries for JOIN on posts.user and posts.user.posts
    expect(getDatabaseQueriesCount()).toBe(3)
  })

  it('handles join on pagination field', async () => {
    const result = await query(`
      query {
        users {
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
    expect(result).toMatchObject({
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
        users {
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

    expect(getDatabaseQueriesCount()).toBe(1)
    expect(result).toMatchObject({
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

  it('should fetch pagination field deep relations', async () => {
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
    )

    const expectedFoo = {
      name: 'foo',
      posts: expect.arrayContaining([
        {
          title: 'foo post',
          user: {
            name: 'foo',
            posts: expect.arrayContaining([
              {
                title: 'foo post',
              },
              {
                title: 'foo post 2',
              },
            ]),
          },
        },
        {
          title: 'foo post 2',
          user: {
            name: 'foo',
            posts: expect.arrayContaining([
              {
                title: 'foo post',
              },
              {
                title: 'foo post 2',
              },
            ]),
          },
        },
      ]),
    }
    expect(result).toMatchObject({
      posts: expect.arrayContaining([
        {
          title: 'foo post',
          user: expectedFoo,
        },
        {
          title: 'foo post 2',
          user: expectedFoo,
        },
        {
          title: 'bar post',
          user: {
            name: 'bar',
            posts: [
              {
                title: 'bar post',
                user: {
                  name: 'bar',
                  posts: [
                    {
                      title: 'bar post',
                    },
                  ],
                },
              },
            ],
          },
        },
      ]),
    })
    expect(getDatabaseQueriesCount()).toBe(1)
  })
})
