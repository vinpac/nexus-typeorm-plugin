import { Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm'

import * as GraphORM from '@/index'
import { Post } from './post'

@GraphORM.DatabaseObjectType()
export class User {
  @PrimaryGeneratedColumn()
  public id: number

  @Column()
  public name: string

  @Column()
  public age: number

  @OneToMany(() => Post, post => post.user)
  public posts: Post[]
}
