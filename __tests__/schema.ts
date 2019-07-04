import { GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql'
import { getRepository } from 'typeorm'

import { buildExecutableSchema } from '@/schema'

import { entities } from '__tests__/entities'
import { User } from '__tests__/entities/user'

export function getTestSchema() {
  return buildExecutableSchema({
    entities,
    enhanceConfig(config, schemaInfo) {
      const userType = schemaInfo.types['User']

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
        config.query = new GraphQLObjectType(queryConfig)
      }

      return config
    }
  })
}
