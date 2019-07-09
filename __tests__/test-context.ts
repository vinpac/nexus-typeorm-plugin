import { User } from '__tests__/entities/user'
import { Post } from '__tests__/entities/post'
import { query, setupTest, create } from '__tests__/util'
import { UserLikesPost } from '__tests__/entities/user-likes-post'

describe('Context', () => {
  setupTest()

  it('handles OR clause', async () => {
    const userFoo = await create(User, {age: 20, name: 'foo'})
    const userBar = await create(User, {age: 30, name: 'bar'})
    const postFoo = await create(Post, {user: userFoo, title: 'foo post'})
    const postBar = await create(Post, {user: userBar, title: 'bar post'})
    await create(UserLikesPost, { user: userFoo, post: postFoo })
    await create(UserLikesPost, { user: userBar, post: postBar })

    const result = await query(
      `{
        posts {
          title
          liked
        }
      }`,
      undefined,
      { userId: userFoo.id },
    )

    expect(result.data).toMatchObject({
      posts: expect.arrayContaining([{
        title: 'foo post',
        liked: true,
      }, {
        title: 'bar post',
        liked: false,
      }])
    })
  })
})
