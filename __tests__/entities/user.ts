import { Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm'

import * as GraphORM from '@/index'

import { Post } from './post'
import { UserLikesPost } from './user-likes-post'

@GraphORM.DatabaseObjectType({
  queryFieldName: 'users'
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
