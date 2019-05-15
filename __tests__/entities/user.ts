import { Field, Int } from 'type-graphql'
import { Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm'

import * as GraphORM from '@/index'
import { Post } from './post'

@GraphORM.DatabaseObjectType({
  alias: 'user',
  relations: ['posts'],
})
export class User {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number

  @Field(() => String)
  @Column()
  name: string

  @Field(() => Int)
  @Column()
  age: number

  @Field(() => [Post])
  @OneToMany(() => Post, post => post.user)
  posts: Post[]
}
