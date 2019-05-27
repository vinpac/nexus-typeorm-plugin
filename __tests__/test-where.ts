import { User } from './entities/user'
import { query, setupTest, create } from './util'

describe('Where', () => {
  setupTest()

  async function setupFixture() {
    await create(User, {age: 20, name: 'foo'})
    await create(User, {age: 30, name: 'bar'})
    await create(User, {age: 40, name: 'baz'})
    await create(User, {age: 50, name: 'quz'})
  }

  beforeEach(async () => {
    await setupFixture()
  })

  it('handles OR clause', async () => {
    const result = await query(`
      query {
        users(where: {
          OR: [
            {
              age: 20
            },
            {
              name: "bar"
            }
          ]
        }) {
          id
          name
          age
        }
      }`
    )

    expect(result.data).toMatchObject({
      users: expect.arrayContaining([
        {
          age: 20,
          id: expect.any(Number),
          name: 'foo',
        },
        {
          age: 30,
          id: expect.any(Number),
          name: 'bar',
        }
      ]),
    })
  })

  it('handles simple operations', async () => {
    const result = await query(`
      query {
        users(where: {
          age_gt: 35,
          age_lt: 50
        }) {
          id
          name
          age
        }
      }`
    )

    expect(result.data).toMatchObject({
      users: [
        {
          age: 40,
          id: expect.any(Number),
          name: 'baz',
        }
      ],
    })
  })
})
