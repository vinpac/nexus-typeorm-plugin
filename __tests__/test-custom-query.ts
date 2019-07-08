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

  it('handles custom resolver', async () => {
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
})
