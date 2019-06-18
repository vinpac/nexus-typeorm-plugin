import { Column, ManyToOne, PrimaryGeneratedColumn, OneToMany } from 'typeorm'

import * as GraphORM from '@/index'

import { User } from './user'
import { UserLikesPost } from './user-likes-post'

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

  @Column({ nullable: true })
  public viewCount?: number

  @ManyToOne(() => User, user => user.posts)
  public user: User

  @Column({ nullable: true })
  @GraphORM.Field({
    addSelect: (sq, _, alias) =>
      sq.select('COUNT(*)', 'count')
        .from(UserLikesPost, 'userLikesPost')
        .where(`"userLikesPost"."postId" = ${alias}.id`),
  })
  public totalLikes?: number

  @OneToMany(() => UserLikesPost, like => like.post)
  public userLikesPosts: UserLikesPost[]
}
