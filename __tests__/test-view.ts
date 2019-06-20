import { User } from './entities/user'
import { query, setupTest, create } from './util'
import { Post } from './entities/post'

describe('View', () => {
  setupTest()

  async function setupFixture() {
    await create(User, {name: 'E', age: 30})
    await create(User, {name: 'C', age: 30})
    const userD = await create(User, {name: 'D', age: 50})
    await create(User, {name: 'A', age: 30})
    const userB = await create(User, {name: 'B', age: 25})

    await create(Post, { user: userB, title: 'X' })
    await create(Post, { user: userB, title: 'Y' })
    await create(Post, { user: userD, title: 'Z' })
  }

  beforeEach(async () => {
    await setupFixture()
  })

  it('handles view', async () => {
    const result = await query(`
      query {
        searchUsers(age: 30) {
          name
          age
        }
      }`
    )

    expect(result.data && result.data.searchUsers).toMatchObject([
      {
        name: 'A',
        age: 30,
      },
      {
        name: 'C',
        age: 30,
      },
      {
        name: 'E',
        age: 30,
      },
    ])
  })

  it('handles multi-depth query', async () => {
    const result = await query(`
      query {
        searchUsers(age: 25) {
          name
          age
          posts(where: {title: "X"}) {
            title
          }
        }
      }
    `)

    expect(result.data && result.data.searchUsers).toMatchObject([
      {
        name: 'B',
        age: 25,
        posts: [
          {
            title: 'X',
          },
        ],
      },
    ])
  })

  it('handles single item query', async () => {
    const result = await query(`
      query {
        oldestUser {
          name
          posts(where: { title: "Z" }) {
            title
          }
        }
      }
    `)

    expect(result.data).toMatchObject({
      oldestUser: {
        name: 'D',
        posts: [
          {
            title: 'Z',
          },
        ],
      },
    })
  })

  it('handles single item query with result of null', async () => {
    const result = await query(`
      query {
        noUser {
          name
        }
      }
    `)

    expect(result.data).toMatchObject({
      noUser: null,
    })
  })
})
