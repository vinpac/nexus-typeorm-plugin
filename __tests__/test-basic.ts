import { Post } from './entities/post'
import { User } from './entities/user'
import { query, setupTest, create } from './util'

describe('Basic', () => {
  setupTest()

  async function setupFixture() {
    const user = await create<User>(User, { age: 3, name: 'Jeong' })
    await create(Post, {
      user,
      title: 'hello',
    })
  }

  beforeEach(async () => {
    await setupFixture()
  })

  it('handles basic query', async () => {
    const result = await query(`
query {
  users {
    id
    name
    age
  }
}`)

    expect(result.data).toMatchObject({
      users: [
        {
          age: 3,
          id: expect.any(Number),
          name: 'Jeong',
        },
      ],
    })
  })

  it('resolves 1:n query', async () => {
    const result = await query(`
query {
  users {
    id
    posts {
      id
      title
      isPublic
    }
  }
}
`)

    expect(result.data).toMatchObject({
      users: [
        {
          id: expect.any(Number),
          posts: [
            {
              id: expect.any(Number),
              title: 'hello',
            },
          ],
        },
      ],
    })
  })

  it('resolves recursive query', async () => {
    const result = await query(`
query {
  users {
    id
    posts {
      id
      user {
        id
        posts {
          title
        }
      }
    }
  }
}`)

    expect(result.data).toMatchObject({
      users: [
        {
          id: expect.any(Number),
          posts: [
            {
              id: expect.any(Number),
              user: {
                id: expect.any(Number),
                posts: [
                  {
                    title: 'hello',
                  },
                ],
              },
            },
          ],
        }
      ]
    })
  })
})
