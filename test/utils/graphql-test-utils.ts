import { GraphQLSchema, graphql } from 'graphql'
import { makeSchema, queryType, stringArg, mutationType, objectType } from 'nexus'
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
import * as path from 'path'

declare global {
  export interface NexusGenCustomOutputProperties<TypeName extends string> {
    entity: NexusTypeORMEntityProperty<TypeName>
    crud: NexusTypeORMCRUDProperty<TypeName>
  }
}

export let schema: GraphQLSchema | undefined
export function createTestSchemaSingleton() {
  if (!schema) {
    schema = makeSchema({
      types: [
        nexusTypeORMPlugin({
          output: {
            typegen: path.resolve('test', '__generated__', 'nexus-typeorm-typegen.ts'),
          },
        }),
        queryType({
          definition: t => {
            t.crud.user()
            t.crud.users()
            t.crud.post()
            t.crud.category()
            t.crud.posts()
            t.crud.users('usersByName', {
              args: (args: any) => ({ ...args, name: stringArg({ nullable: false }) }),
              resolve: (ctx: any) => {
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
              args: (args: any) => ({
                ...args,
                categoryId: stringArg({ nullable: false }),
              }),
              resolve: (ctx: any) => {
                return ctx.next({
                  ...ctx,
                  queryBuilderConfig: (config: any) => ({
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
        objectType({
          name: 'User',
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
                    ids: follows.map(follow => follow.followerId),
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
      outputs: {
        typegen: path.resolve('test', '__generated__', 'nexus-typegen.ts'),
        schema: path.resolve('test', '__generated__', 'schema.graphql'),
      },
      shouldGenerateArtifacts: true,
      formatTypegen: (content, type) =>
        type === 'schema'
          ? content
          : `/* eslint-disable */\n\n${content.replace(
              `import { core } from "nexus"`,
              `// @ts-ignore\nimport { core } from "nexus"`,
            )}`,
    })
  }

  return schema
}
;``

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
