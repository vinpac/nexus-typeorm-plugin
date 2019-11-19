import { GraphQLSchema, graphql } from 'graphql'
import { makeSchema, queryType, stringArg, mutationType } from 'nexus'
import { User } from 'test/entities/user'
import { entityType } from '../../src/nexus/nexus-types'
import { UserProfile } from 'test/entities/user-profile'
import { Post } from 'test/entities/post'
import { UserLikesPost } from 'test/entities/user-likes-post'
import { UserFollows } from 'test/entities/user-follows'
import { Email } from 'test/entities/email'
import { getConnection } from 'typeorm'
import { nexusTypeORMPlugin } from 'src/plugin'
import { Category } from 'test/entities/category'
import { propertyPathToAlias } from 'src/query-builder'

export let schema: GraphQLSchema | undefined
export function createTestSchemaSingleton() {
  if (!schema) {
    schema = makeSchema({
      types: [
        nexusTypeORMPlugin(),
        queryType({
          definition: t => {
            t.crud.user()
            t.crud.users()
            t.crud.post()
            t.crud.category()
            t.crud.posts()
            t.crud.users('usersByName', {
              args: args => ({ ...args, name: stringArg({ nullable: false }) }),
              resolve: ctx => {
                ctx.args.where = {
                  ...ctx.args.where,
                  name: ctx.args.name,
                }
                return ctx.next(ctx)
              },
            })
            t.crudField('postsByCategoryId', {
              entity: 'Post',
              type: 'Post',
              method: 'findMany',
              args: args => ({
                ...args,
                categoryId: stringArg({ nullable: false }),
              }),
              resolve: ctx => {
                return ctx.next({
                  ...ctx,
                  queryBuilderConfig: config => ({
                    ...config,
                    joins: [
                      ...(config.joins || []),
                      {
                        type: 'inner',
                        select: false,
                        propertyPath: 'categories',
                        where: {
                          expression: `${propertyPathToAlias('categories')}.id = :id`,
                          params: { id: ctx.args.categoryId },
                        },
                      },
                    ],
                  }),
                })
              },
            })
          },
        }),
        mutationType({
          definition: t => {
            t.crud.createOneUser()
            t.crud.createOnePost()
            t.crud.createOneCategory()
          },
        }),
        entityType<User>(User, {
          definition: t => {
            t.entityFields()
            t.crud.userFollows('followers', {
              type: 'User',
              resolve: async ctx => {
                const follows = await ctx.next(ctx)

                return getConnection()
                  .getRepository(User)
                  .createQueryBuilder()
                  .where('id IN (:...ids)', {
                    ids: follows.map((follow: UserFollows) => follow.followerId),
                  })
                  .getMany()
              },
            })
          },
        }),
        entityType(UserProfile),
        entityType(Post),
        entityType(UserFollows),
        entityType(UserLikesPost),
        entityType(Email),
        entityType(Category),
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
  options?: { supressErrorMessage: boolean },
) {
  if (schema) {
    const result = await graphql(schema, queryString, undefined, context, variables)

    if (result.errors && result.errors[0]) {
      if (!options || !options.supressErrorMessage) {
        // eslint-disable-next-line no-console
        console.error(result.errors[0].stack)
      }
      throw result.errors[0]
    }

    return result.data!
  }

  throw new Error('GraphQL schema is not ready!')
}
