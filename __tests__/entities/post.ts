import { Field, Int } from 'type-graphql'
import { Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

import * as GraphORM from '@/index'
import { User } from './user'

@GraphORM.DatabaseObjectType()
export class Post {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  public id: number

  @Field(() => String)
  @Column()
  public title: string

  @Field(() => User)
  @ManyToOne(() => User, user => user.posts)
  public user: User
}
