import { User } from '__tests__/entities/user'
import { Post } from '__tests__/entities/post'
import { query, setupTest, create } from '__tests__/util'
import { UserLikesPost } from '__tests__/entities/user-likes-post'

describe('Custom query', () => {
  setupTest()

  async function setupFixture() {
    const userFoo = await create(User, {age: 20, name: 'foo'})
    const userBar = await create(User, {age: 30, name: 'bar'})
    await create(Post, {user: userFoo, title: 'foo post'})
    const postBar = await create(Post, {user: userBar, title: 'bar post'})
    await create(UserLikesPost, {user: userFoo, post: postBar})
  }

  beforeEach(async () => {
    await setupFixture()
  })

  it('handles custom resolver - one to many', async () => {
    const result = await query(`
      {
        userWithName(name: "bar") {
          id
          name
          posts {
            id
            title
            totalLikes
          }
        }
      }`
    )

    expect(result.data!).toMatchObject({
      userWithName: {
        id: expect.any(Number),
        name: 'bar',
        posts: [{
          id: expect.any(Number),
          title: 'bar post',
          totalLikes: 1,
        }],
      }
    })
    expect(result.data!.userWithName.posts).toHaveLength(1)
  })

  it('handles custom resolver - many to one', async () => {
    const result = await query(`
      {
        postWithTitle(title: "bar post") {
          id
          title
          user {
            id
            name
            numPosts
          }
        }
      }`
    )

    expect(result.data!).toMatchObject({
      postWithTitle: {
        id: expect.any(Number),
        title: 'bar post',
        user: {
          id: expect.any(Number),
          name: 'bar',
          numPosts: 1,
        },
      }
    })
  })
})
