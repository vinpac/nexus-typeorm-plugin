import { getConnection } from 'typeorm'

import { Post } from './entities/post'
import { User } from './entities/user'
import { query, setupTest } from './util'

describe('Basic', () => {
  setupTest()

  async function setupFixture() {
    const conn = getConnection()
    const user = new User()

    user.age = 3
    user.name = 'Jeong'

    await conn.getRepository(User).save(user)

    const post = new Post()

    post.title = 'hello'
    post.user = user

    await conn.getRepository(Post).save(post)
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
