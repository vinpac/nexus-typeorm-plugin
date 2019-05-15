import { Field, Int } from 'type-graphql'
import { Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

import * as GraphORM from '@/index'
import { User } from './user'

@GraphORM.DatabaseObjectType({
  alias: 'post',
})
export class Post {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number

  @Field(() => String)
  @Column()
  title: string

  @ManyToOne(() => User, user => user.posts)
  user: User
}
