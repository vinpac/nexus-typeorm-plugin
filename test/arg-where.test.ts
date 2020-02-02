import { User } from './entities/user'
import { Post } from './entities/post'
import { query, setupTest, create, getDatabaseQueriesCount } from './utils'
import { translateWhereClause } from 'src/args/arg-where'
import { getConnection } from 'typeorm'

describe('Where', () => {
  setupTest(async () => {
    const userFoo = await create(User, { age: 20, name: 'foo' })
    const userBar = await create(User, { age: 30, name: 'bar' })
    await create(User, { age: 40, name: 'baz' })
    await create(User, { age: 50, name: 'quz' })
    await create(Post, { user: userFoo, title: 'foo post' })
    await create(Post, { user: userBar, title: 'bar post' })
  })

  it('handles AND clause', async () => {
    const {
      driver: { escape },
    } = getConnection()
    expect(
      translateWhereClause('User', {
        age: 32,
        name: 'baz',
      }),
    ).toEqual({
      expression: `${escape('User')}.${escape('age')} = :age1 AND ${escape('User')}.${escape(
        'name',
      )} = :name2`,
      params: { age1: 32, name2: 'baz' },
    })
  })

  it('handles OR clause', async () => {
    const result = await query(`
      query {
        users(where: {
          OR: [
            {
              age: { equals :  20 }
            },
            {
              name: { equals : "bar" }
            },
            {
              age: { equals : 50 },
            }
          ]
        }) {
          id
          name
          age
        }
      }`)

    expect(result.users).toHaveLength(3)
    expect(result).toMatchObject({
      users: expect.arrayContaining([
        {
          age: 20,
          id: expect.any(String),
          name: 'foo',
        },
        {
          age: 30,
          id: expect.any(String),
          name: 'bar',
        },
        {
          age: 50,
          id: expect.any(String),
          name: 'quz',
        },
      ]),
    })
  })

  it('handles simple operations', async () => {
    const result = await query(`
      query {
        users(where: {
          age : { gt: 35, lt: 50 }
        }) {
          id
          name
          age
        }
      }`)

    expect(result).toMatchObject({
      users: [
        {
          age: 40,
          id: expect.any(String),
          name: 'baz',
        },
      ],
    })
  })

  it('handles NOT operation', async () => {
    const result = await query(
      `
      query UsersExceptSomeAges($first: Int, $second: Int) {
        users(where: {
          NOT: {
            OR: [{
              age: { equals : $first },
            }, {
              age: { equals : $second },
            }]
          }
        }) {
          age
        }
      }
    `,
      {
        first: 30,
        second: 40,
      },
    )

    expect(result.users).toHaveLength(2)
    expect(result).toMatchObject({
      users: expect.arrayContaining([
        {
          age: 20,
        },
        {
          age: 50,
        },
      ]),
    })
  })

  it('handles {fieldName}_contain operation', async () => {
    const result = await query(
      `query UsersNameContainsZ {
        users(first: 10, where: { name : { contains: "z" } }) {
          name
          age
        }
      }`,
    )

    expect(result.users).toHaveLength(2)
    expect(result).toMatchObject({
      users: expect.arrayContaining([
        {
          name: 'baz',
          age: 40,
        },
        {
          name: 'quz',
          age: 50,
        },
      ]),
    })
  })

  it('handles NOT {fieldName}_contain operation', async () => {
    const result = await query(
      `query UsersNameContainsZ {
        users(first: 10, where: { NOT: { name : { contains: "z" } }}) {
          name
          age
        }
      }`,
    )

    expect(result.users).toHaveLength(2)
    expect(result).toMatchObject({
      users: expect.arrayContaining([
        {
          name: 'foo',
          age: 20,
        },
        {
          name: 'bar',
          age: 30,
        },
      ]),
    })
  })

  it('handles nested where', async () => {
    const result = await query(`
      query {
        users(where: {
          name : { in: ["foo", "bar"] }
        }) {
          id
          name
          posts(where: {
            title: { equals : "foo post" }
          }) {
            id
            title
          }
        }
      }
    `)

    expect(result).toMatchObject({
      users: expect.arrayContaining([
        {
          id: expect.any(String),
          name: 'foo',
          posts: [
            {
              id: expect.any(String),
              title: 'foo post',
            },
          ],
        },
        {
          id: expect.any(String),
          name: 'bar',
          posts: [],
        },
      ]),
    })
    expect(result.users).toHaveLength(2)
    expect(getDatabaseQueriesCount()).toBe(3)
  })
})
