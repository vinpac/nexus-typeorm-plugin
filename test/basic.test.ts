import { Post } from './entities/post'
import { User, UserType } from './entities/user'
import { query, setupTest, create, resetLogger, getDatabaseQueriesCount } from './utils'
import { Email } from './entities/email'
import { UserLikesPost } from './entities/user-likes-post'
import { UserProfile } from './entities/user-profile'
import { UserFollows } from './entities/user-follows'

describe('Basic', () => {
  setupTest()
  beforeEach(async () => {
    const jeong = await create<User>(User, {
      age: 3,
      name: 'Jeong',
      type: UserType.NORMAL,
    })
    await create<User>(User, {
      age: 4,
      name: 'John',
      type: UserType.NORMAL,
    })
    const janet = await create<User>(User, {
      age: 5,
      name: 'Janet',
      type: UserType.NORMAL,
    })
    await create(UserFollows, {
      follower: janet,
      followee: jeong,
    })

    await create<UserProfile>(UserProfile, {
      user: jeong,
      displayName: 'John doe',
      slug: 'john-doe',
    })
    const post = await create(Post, {
      user: jeong,
      title: 'hello',
    })
    await create(UserLikesPost, {
      user: jeong,
      post,
    })
    await create(Email, {
      user: jeong,
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
          id: expect.any(String),
          name: 'Jeong',
          type: UserType.NORMAL,
        },
        {
          age: 4,
          id: expect.any(String),
          name: 'John',
          type: UserType.NORMAL,
        },
        {
          age: 5,
          id: expect.any(String),
          name: 'Janet',
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
        id: expect.any(String),
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

    expect(result.errors).toBe(undefined)
    expect(result.data).toMatchObject({
      users: [
        {
          id: expect.any(String),
          posts: [
            {
              id: expect.any(String),
              title: 'hello',
              isPublic: false,
            },
          ],
        },
        {
          id: expect.any(String),
          posts: [],
        },
        {
          id: expect.any(String),
          posts: [],
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

    expect(result.errors).toBe(undefined)
    expect(result.data).toMatchObject({
      users: [
        {
          id: expect.any(String),
          posts: [
            {
              id: expect.any(String),
              user: {
                id: expect.any(String),
                posts: [
                  {
                    title: 'hello',
                  },
                ],
              },
            },
          ],
        },
        {
          id: expect.any(String),
          posts: [],
        },
        {
          id: expect.any(String),
          posts: [],
        },
      ],
    })
    expect(getDatabaseQueriesCount()).toBe(6)
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
        id: expect.any(String),
        userLikesPosts: [
          {
            id: expect.any(String),
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

  it('should query a custom field', async () => {
    const result = await query(`{
      user {
        id
        followers {
          id
          name
        }
      }
    }`)

    expect(result.errors).toBeUndefined()
    expect(result.data).toEqual({
      user: {
        id: '1',
        followers: [{ id: '3', name: 'Janet' }],
      },
    })
  })
})
