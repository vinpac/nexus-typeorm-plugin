import { setupTest, create, query } from '__tests__/util'
import { User, UserType } from '__tests__/entities/user'
import { UserFollows } from '__tests__/entities/user-follows'
import { Post } from '__tests__/entities/post'

describe('', () => {
  setupTest()

  async function setupFixture() {
    const userA = await create<User>(User, {
      age: 30,
      name: 'A',
      type: UserType.NORMAL,
    })

    const userB = await create<User>(User, {
      age: 30,
      name: 'B',
      type: UserType.NORMAL,
    })

    await create<Post>(Post, {
      title: 'Hello',
      user: userB,
    })

    await create(UserFollows, {
      user: userA,
      peer: userB,
    })
  }

  beforeEach(async () => {
    await setupFixture()
  })

  it('', async () => {
    const result = await query(`{
      users {
        name
        followees {
          peer {
            name
            posts {
              title
            }
          }
        }
      }
    }`)

    expect(result).toMatchObject({
      data: {
        users: expect.arrayContaining([{
          name: 'A',
          followees: [
            {
              peer: {
                name: 'B',
                posts: [
                  {
                    title: 'Hello',
                  }
                ]
              }
            }
          ]
        }])
      }
    })
  })
})
