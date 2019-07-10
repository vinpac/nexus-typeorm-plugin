import { User } from '__tests__/entities/user'
import { Post } from '__tests__/entities/post'
import { query, setupTest, create } from '__tests__/util'

describe('String typed field', () => {
  setupTest()

  it('handles string typed field', async () => {
    const user = await create(User, {age: 20, name: 'foo'})
    await create(Post, {user: user, title: 'foo post'})
    const postBar = await create(Post, {user: user, title: 'bar post'})

    const result = await query(
      `{
        users {
          mostRecentPost {
            id
            title
          }
        }
      }`
    )

    expect(result.data).toMatchObject({
      users: [{
        mostRecentPost: {
          id: postBar.id,
          title: 'bar post',
        }
      }]
    })
  })
})
