import { User } from './entities/user'
import { Post } from './entities/post'
import { query, setupTest, create } from './utils'

describe('Order By', () => {
  setupTest(async () => {
    const userA = await create(User, { name: 'A', age: 30 })
    await create(User, { name: 'B', age: 20 })
    await create(User, { name: 'C', age: 30 })
    await create(User, { name: 'D', age: 20 })
    await create(User, { name: 'E', age: 30 })

    await create(Post, { user: userA, viewCount: 20, title: 'foo' })
    await create(Post, { user: userA, viewCount: 30, title: 'bar' })
    await create(Post, { user: userA, viewCount: 50, title: 'baz' })
    await create(Post, { user: userA, viewCount: 40, title: 'qux' })
  })

  it('handles orderBy', async () => {
    const result = await query(`
      query {
        posts(orderBy: { viewCount : DESC }) {
          title
          viewCount
        }
      }`)

    expect(result.posts).toHaveLength(4)
    expect(result.posts).toMatchObject([
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
        users( where: { name: { equals : "A" }}) {
          posts(orderBy: { viewCount : ASC }) {
            title
            viewCount
          }
        }
      }`)

    expect(result).toMatchObject({
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
        },
      ],
    })
  })

  it('handles orderBy with nested orderBy', async () => {
    const result = await query(`
      query {
        users(
          where: {name : { in: ["A", "B"] } },
          orderBy: { age : DESC},
        ) {
          name
          age
          posts(orderBy: { viewCount : ASC }) {
            viewCount
          }
        }
      }
    `)

    expect(result).toMatchObject({
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

  // The next test will not pass : How to prioritize sort properties when we have an object style api ?
  // How does Nexus-Prisma solve this ? I think they just don't. We could have an array of objects.
  // But it's less elegant.

  // it('handles orderBy with multiple columns', async () => {
  //   const result = await query(`
  //     query {
  //       users(orderBy: {age : DESC, name : ASC}) {
  //         age
  //         name
  //       }
  //     }
  //   `)

  //   expect(result).toMatchObject({
  //     users: [
  //       {
  //         age: 30,
  //         name: 'A',
  //       },
  //       {
  //         age: 30,
  //         name: 'C',
  //       },
  //       {
  //         age: 30,
  //         name: 'E',
  //       },
  //       {
  //         age: 20,
  //         name: 'B',
  //       },
  //       {
  //         age: 20,
  //         name: 'D',
  //       },
  //     ],
  //   })
  // })
})
