import { User } from '__tests__/entities/user'
import { Email } from '__tests__/entities/email'
import { query, setupTest, create } from '__tests__/util'

describe('One to one', () => {
  setupTest()

  it('handles one to one relation', async () => {
    const user = await create(User, {age: 20, name: 'foo'})
    const email = await create(Email, {user, address: 'example@mail.com'})

    const result = await query(
      `{
        users {
          email {
            address
          }
        }
      }`
    )

    expect(result.data).toMatchObject({
      users: [{
        email: {
          address: email.address,
        }
      }]
    })
  })
})
