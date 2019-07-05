import { Column, OneToMany, PrimaryGeneratedColumn, getRepository } from 'typeorm'
import { GraphQLInt, GraphQLString } from 'graphql'

import * as GraphORM from '@/index'

import { Post } from './post'
import { UserLikesPost } from './user-likes-post'

export enum UserType {
  ADMIN = 'ADMIN',
  NORMAL = 'NORMAL',
}

@GraphORM.DatabaseObjectType({
  views: [
    {
      name: 'users',
      isDirectView: true,
    },

    {
      name: 'searchUsers',
      args: {
        age: {
          type: GraphQLInt,
        },
      },
      getIds: async ({
        args,
      }) => {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const users = await getRepository(User).find({
          where: {
            age: args.age,
          },
          order: {
            name: 'ASC',
          },
        })

        return users.map(user => user.id)
      },
    },

    {
      name: 'oldestUser',
      getId: async () => {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const user = await getRepository(User).findOne({
          order: {
            age: 'DESC',
          },
        })

        return user && user.id
      },
    },

    {
      name: 'noUser',
      getId: async() => undefined
    },
  ],
})
export class User {
  @PrimaryGeneratedColumn()
  public id: number

  @Column()
  public name: string

  @Column()
  public age: number

  @Column({ enum: UserType, type: 'enum', default: UserType.NORMAL })
  public type: UserType

  @OneToMany(() => Post, post => post.user)
  public posts: Post[]

  @OneToMany(() => UserLikesPost, like => like.user)
  public userLikesPosts: UserLikesPost[]

  @GraphORM.Field<User, {}>({
    type: GraphQLString,
    resolve: source => {
      return [...source.name].reverse().join('')
    },
  })
  public reversedName: string
}
