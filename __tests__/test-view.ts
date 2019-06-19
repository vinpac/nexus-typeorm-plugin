import { User } from './entities/user'
import { query, setupTest, create } from './util'
import { Post } from './entities/post'

describe('View', () => {
  setupTest()

  async function setupFixture() {
    await create(User, {name: 'E', age: 30})
    await create(User, {name: 'C', age: 30})
    await create(User, {name: 'D', age: 20})
    await create(User, {name: 'A', age: 30})
    const userB = await create(User, {name: 'B', age: 25})

    await create(Post, { user: userB, title: 'X' })
    await create(Post, { user: userB, title: 'Y' })
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
})
