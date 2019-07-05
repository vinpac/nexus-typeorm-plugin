import { Column, ManyToOne, PrimaryGeneratedColumn, OneToMany } from 'typeorm'

import * as GraphORM from '@/index'

import { User } from './user'
import { UserLikesPost } from './user-likes-post'

@GraphORM.DatabaseObjectType({
  views: [{
    name: 'posts',
    isDirectView: true,
  }],
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

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date

  @Column({ nullable: true })
  @GraphORM.Field({
    nullable: false,
    addSelect(sq, _, alias) {
      sq.select('COUNT(*)', 'count')
        .from(UserLikesPost, 'userLikesPost')

      if (process.env.TEST_DB_TYPE === 'postgres') {
        sq.where(`"userLikesPost"."postId" = ${alias}.id`)
      } else {
        sq.where(`userLikesPost.postId = ${alias}.id`)
      }

      return sq
    }
  })
  public totalLikes?: number

  @OneToMany(() => UserLikesPost, like => like.post)
  public userLikesPosts: UserLikesPost[]
}
