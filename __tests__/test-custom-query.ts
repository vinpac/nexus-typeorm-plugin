import { User } from './entities/user'
import { Post } from './entities/post'
import { query, setupTest, create } from './util'

describe('Custom query', () => {
  setupTest()

  async function setupFixture() {
    const userFoo = await create(User, {age: 20, name: 'foo'})
    const userBar = await create(User, {age: 30, name: 'bar'})
    await create(Post, {user: userFoo, title: 'foo post'})
    await create(Post, {user: userBar, title: 'bar post'})
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
        }],
      }
    })
    expect(result.data!.userWithName.posts).toHaveLength(1)
  })
})
