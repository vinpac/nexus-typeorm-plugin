import { Post } from './entities/post'
import { User, UserType } from './entities/user'
import { query, setupTest, create, getDatabaseQueriesCount } from './utils'
import { Email } from './entities/email'
import { UserLikesPost } from './entities/user-likes-post'
import { UserProfile } from './entities/user-profile'
import { UserFollows } from './entities/user-follows'

describe('Basic', () => {
  setupTest(async () => {
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
  })

  test('shoud query an entity with nullable fields', async () => {
    const result = await query(`{
      users {
        id
        name
        age
        type
      }
    }`)

    expect(result).toMatchObject({
      users: expect.arrayContaining([
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
          age: null,
          id: expect.any(String),
          name: 'Janet',
          type: UserType.NORMAL,
        },
      ]),
    })
    expect(getDatabaseQueriesCount()).toBe(1)
  })

  test('throws an error if foreign key is not defined in schema', async () => {
    try {
      await query(
        `{
        users {
          id
          email {
            address
          }
        }
      }`,
        undefined,
        undefined,
        { supressErrorMessage: true },
      )
    } catch (error) {
      expect(error).toMatchObject({
        message: "Foreign key 'emailId' is not defined in User schema",
      })
    }
  })
})
