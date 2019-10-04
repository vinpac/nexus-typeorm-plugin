import { GraphQLSchema, graphql } from 'graphql'
import { makeSchema, queryType } from 'nexus'
import { User } from 'test/entities/user'
import { entityType } from '../../src/nexus/nexus-types'
import { UserProfile } from 'test/entities/user-profile'
import { Post } from 'test/entities/post'
import { UserLikesPost } from 'test/entities/user-likes-post'
import { UserFollows } from 'test/entities/user-follows'
import { Email } from 'test/entities/email'
import { getConnection } from 'typeorm'
import { nexusTypeQLPlugin } from 'src/plugin'

export let schema: GraphQLSchema | undefined
export function createTestSchemaSingleton() {
  if (!schema) {
    const user = entityType<User>(User, {
      definition: t => {
        t.entityFields('*')
        t.paginationField('followers', {
          type: 'User',
          entity: 'UserFollows',
          resolve: async (source: User, args, ctx, info, next) => {
            const follows = await next(source, args, ctx, info)

            return getConnection()
              .getRepository(User)
              .find({
                id: follows.map((follow: UserFollows) => follow.followerId),
              })
          },
        })
      },
    })
    const query = queryType({
      definition: t => {
        t.paginationField('users', { entity: 'User' })
        t.paginationField('posts', { entity: 'Post' })
        t.uniqueField('user', { entity: 'User' })
        t.uniqueField('post', { entity: 'Post' })
      },
    })

    schema = makeSchema({
      types: [
        nexusTypeQLPlugin(),
        query,
        user,
        entityType(UserProfile),
        entityType(Post),
        entityType(UserFollows),
        entityType(UserLikesPost),
        entityType(Email),
      ],
      outputs: false,
    })
  }

  return schema
}

export async function query(
  queryString: string,
  variables?: { [key: string]: any },
  context?: object,
) {
  if (schema) {
    return graphql(schema, queryString, undefined, context, variables)
  }

  throw new Error('GraphQL schema is not ready!')
}
