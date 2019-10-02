import { Post } from './entities/post'
import { User, UserType } from './entities/user'
import { query, setupTest, create, resetLogger, getDatabaseQueriesCount } from './utils'
import { Email } from './entities/email'
import { UserLikesPost } from './entities/user-likes-post'
import { UserProfile } from './entities/user-profile'

describe('Basic', () => {
  setupTest()
  beforeEach(async () => {
    const user = await create<User>(User, {
      age: 3,
      name: 'Jeong',
      type: UserType.NORMAL,
    })

    await create<UserProfile>(UserProfile, {
      user,
      displayName: 'John doe',
      slug: 'john-doe',
    })
    const post = await create(Post, {
      user,
      title: 'hello',
    })
    await create(UserLikesPost, {
      user,
      post,
    })
    await create(Email, {
      user,
      address: 'john@doe.com.br',
    })
    resetLogger()
  })

  it('handles basic query', async () => {
    const result = await query(`{
      users {
        id
        name
        age
        type
      }
    }`)

    expect(result.data).toMatchObject({
      users: [
        {
          age: 3,
          id: expect.any(Number),
          name: 'Jeong',
          type: UserType.NORMAL,
        },
      ],
    })
    expect(getDatabaseQueriesCount()).toBe(1)
  })

  it('resolves 1:1 query', async () => {
    const result = await query(`{
      user (where: { name: "Jeong" }) {
        id
        profile {
          displayName
          slug
        }
      }
    }`)

    expect(result.errors).toEqual(undefined)
    expect(result.data).toMatchObject({
      user: {
        id: expect.any(Number),
        profile: {
          displayName: 'John doe',
          slug: 'john-doe',
        },
      },
    })
  })

  it('resolves 1:n query', async () => {
    const result = await query(`{
      users {
        id
        posts {
          id
          title
          isPublic
          createdAt
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
              title: 'hello',
              isPublic: false,
            },
          ],
        },
      ],
    })
  })

  it('resolves recursive query', async () => {
    const result = await query(`{
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
        },
      ],
    })
    expect(getDatabaseQueriesCount()).toBe(4)
  })

  it('resolves n:1', async () => {
    const result = await query(`{
      user (where: { name: "Jeong" }) {
        id
        userLikesPosts {
          id
        }
      }
    }`)

    expect(result.data).toMatchObject({
      user: {
        id: expect.any(Number),
        userLikesPosts: [
          {
            id: expect.any(Number),
          },
        ],
      },
    })
    expect(getDatabaseQueriesCount()).toBe(2)
  })

  it('throws an error if foreign key is not defined in schema', async () => {
    const result = await query(`{
      users {
        id
        email {
          address
        }
      }
    }`)

    expect(result.errors![0]).toMatchObject({
      message: "Foreign key 'emailId' is not defined in User schema",
    })
  })
})
