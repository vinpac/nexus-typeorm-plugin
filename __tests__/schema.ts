import { GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql'
import { getRepository } from 'typeorm'

import { buildExecutableSchema } from '@/schema'

import { entities } from '__tests__/entities'
import { User } from '__tests__/entities/user'
import { Post } from '__tests__/entities/post'

export function getTestSchema() {
  return buildExecutableSchema({
    entities,
    enhanceConfig(config, schemaInfo) {
      const userType = schemaInfo.types['User']
      const postType = schemaInfo.types['Post']

      if (config.query) {
        const queryConfig = config.query.toConfig()

        queryConfig.fields['userWithName'] = {
          args: {
            name: {
              type: GraphQLNonNull(GraphQLString),
            },
          },
          type: userType,
          async resolve(_, args) {
            const user = await getRepository(User).findOne({
              name: args.name,
            })

            if (user) {
              return {
                id: user.id,
              }
            }
          }
        }

        queryConfig.fields['postWithTitle'] = {
          args: {
            title: {
              type: GraphQLNonNull(GraphQLString),
            },
          },
          type: postType,
          async resolve(_, args) {
            const post = await getRepository(Post).findOne({
              title: args.title,
            })

            if (post) {
              return {
                id: post.id,
              }
            }
          }
        }

        config.query = new GraphQLObjectType(queryConfig)
      }

      return config
    }
  })
}
