import { Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

import * as GraphORM from '@/index'
import { User } from './user'

@GraphORM.DatabaseObjectType({
  queryFieldName: 'posts'
})
export class Post {
  @PrimaryGeneratedColumn()
  public id: number

  @Column()
  public title: string

  @Column({ nullable: true })
  public isPublic?: boolean

  @ManyToOne(() => User, user => user.posts)
  public user: User
}
