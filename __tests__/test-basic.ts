import { getConnection } from 'typeorm'

import { Post } from './entities/post'
import { User } from './entities/user'
import { query, setupTest } from './util'

describe('Basic', () => {
  setupTest()

  it('handles basic query', async () => {
    const conn = getConnection()
    const user = new User()

    user.age = 3
    user.name = 'Jeong'

    await conn.getRepository(User).save(user)

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
    const conn = await getConnection()
    const user = new User()

    user.age = 3
    user.name = 'Jeong'

    await conn.getRepository(User).save(user)

    const post = new Post()

    post.title = 'hello'
    post.user = user

    await conn.getRepository(Post).save(post)

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
})
