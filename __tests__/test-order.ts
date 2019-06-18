import { User } from './entities/user'
import { Post } from './entities/post'
import { query, setupTest, create } from './util'

describe('Order', () => {
  setupTest()

  async function setupFixture() {
    const userFoo = await create(User, {name: 'A', age: 30})
    await create(User, {name: 'B', age: 20})
    await create(User, {name: 'C', age: 30})
    await create(User, {name: 'D', age: 20})
    await create(User, {name: 'E', age: 30})

    await create(Post, {user: userFoo, viewCount: 20, title: 'foo'})
    await create(Post, {user: userFoo, viewCount: 30, title: 'bar'})
    await create(Post, {user: userFoo, viewCount: 50, title: 'baz'})
    await create(Post, {user: userFoo, viewCount: 40, title: 'qux'})
  }

  beforeEach(async () => {
    await setupFixture()
  })

  it('handles orderBy', async () => {
    const result = await query(`
      query {
        posts(orderBy: viewCount_DESC) {
          title
          viewCount
        }
      }`
    )

    expect(result.data!.posts).toHaveLength(4)
    expect(result.data!.posts).toMatchObject([
      {
        title: 'baz',
        viewCount: 50,
      },
      {
        title: 'qux',
        viewCount: 40,
      },
      {
        title: 'bar',
        viewCount: 30,
      },
      {
        title: 'foo',
        viewCount: 20,
      },
    ])
  })

  it('handles nested orderBy', async () => {
    const result = await query(`
      query {
        users(where: {name: "A"}) {
          posts(orderBy: viewCount_ASC) {
            title
            viewCount
          }
        }
      }`
    )

    expect(result.data).toMatchObject({
      users: [
        {
          posts: [
            {
              title: 'foo',
              viewCount: 20,
            },
            {
              title: 'bar',
              viewCount: 30,
            },
            {
              title: 'qux',
              viewCount: 40,
            },
            {
              title: 'baz',
              viewCount: 50,
            },
          ],
        }
      ]
    })
  })

  it('handles orderBy with nested orderBy', async () => {
    const result = await query(`
      query {
        users(
          where: {name_in: ["A", "B"]},
          orderBy: age_DESC,
        ) {
          name
          age
          posts(orderBy: viewCount_ASC) {
            viewCount
          }
        }
      }
    `)

    expect(result.data).toMatchObject({
      users: [
        {
          age: 30,
          name: 'A',
          posts: [
            {
              viewCount: 20,
            },
            {
              viewCount: 30,
            },
            {
              viewCount: 40,
            },
            {
              viewCount: 50,
            },
          ],
        },
        {
          age: 20,
          name: 'B',
        },
      ],
    })
  })

  it('handles orderBy with multiple columns', async () => {
    const result = await query(`
      query {
        users(orderBy: [age_DESC, name_ASC]) {
          age
          name
        }
      }
    `)

    expect(result.data).toMatchObject({
      users: [
        {
          age: 30,
          name: 'A'
        },
        {
          age: 30,
          name: 'C',
        },
        {
          age: 30,
          name: 'E',
        },
        {
          age: 20,
          name: 'B',
        },
        {
          age: 20,
          name: 'D',
        },
      ]
    })
  })
})
