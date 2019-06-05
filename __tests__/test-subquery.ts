import { setupTest, create, query } from './util'
import { User } from './entities/user'
import { Post } from './entities/post'
import { UserLikesPost } from './entities/user-likes-post'

describe('Subquery', () => {
  setupTest()

  async function setupFixture() {
    const userFoo = await create(User, {age: 20, name: 'foo'})
    const userBar = await create(User, {age: 20, name: 'bar'})

    const postFoo = await create(Post, {user: userFoo, title: 'foo post'})
    const postBar = await create(Post, {user: userBar, title: 'bar post'})

    await create(UserLikesPost, { user: userFoo, post: postFoo })
    await create(UserLikesPost, { user: userBar, post: postFoo })
    await create(UserLikesPost, { user: userBar, post: postBar })
  }

  beforeEach(async () => {
    await setupFixture()
  })

  it('resolves fields calculated with subqueries', async () => {
    const result = await query(`
      query {
        posts {
          title
          totalLikes
          userLikesPosts {
            user {
              name
            }
          }
        }
      }`
    )

    expect(result.data!.posts).toHaveLength(2)
    expect(result).toMatchObject({
      data: {
        posts: expect.arrayContaining([
          {
            title: 'foo post',
            totalLikes: 2,
            userLikesPosts: expect.arrayContaining([
              {
                user: {
                  name: 'foo',
                },
              },
              {
                user: {
                  name: 'bar'
                },
              },
            ]),
          },
          {
            title: 'bar post',
            totalLikes: 1,
            userLikesPosts: [
              {
                user: {
                  name: 'bar',
                },
              }
            ],
          },
        ])
      },
    })
  })

  it('resolves nested subqueries', async () => {
    const result = await query(`
      query {
        users(where: { name: "foo" }) {
          posts {
            totalLikes
          }
        }
      }
    `)

    expect(result).toMatchObject({
      data: {
        users: [
          {
            posts: [
              {
                totalLikes: 2,
              },
            ],
          },
        ],
      },
    })
  })
})
