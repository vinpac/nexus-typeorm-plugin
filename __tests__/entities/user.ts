import { Column, OneToMany, PrimaryGeneratedColumn, getConnection } from 'typeorm'
import { GraphQLInt } from 'graphql'

import * as GraphORM from '@/index'

import { Post } from './post'
import { UserLikesPost } from './user-likes-post'

@GraphORM.DatabaseObjectType({
  views: [{
    name: 'users',
    isDirectView: true,
  }, {
    name: 'searchUsers',
    args: {
      age: {
        type: GraphQLInt,
      },
    },
    getIds: async ({
      args,
    }) => {
      const conn = getConnection()
      const users = await conn.getRepository(User).find({  // eslint-disable-line
        where: {
          age: args.age,
        },
        order: {
          name: 'ASC',
        },
      })

      return users.map(user => user.id)
    },
  }],
})
export class User {
  @PrimaryGeneratedColumn()
  public id: number

  @Column()
  public name: string

  @Column()
  public age: number

  @OneToMany(() => Post, post => post.user)
  public posts: Post[]

  @OneToMany(() => UserLikesPost, like => like.user)
  public userLikesPosts: UserLikesPost[]
}
