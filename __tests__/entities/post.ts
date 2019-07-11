import { Column, ManyToOne, PrimaryGeneratedColumn, OneToMany } from 'typeorm'

import * as GraphORM from '@/index'

import { User } from '__tests__/entities/user'
import { UserLikesPost } from '__tests__/entities/user-likes-post'
import { TestContext, GraphQLTestBoolean } from '__tests__/types'

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

  @Column({ nullable: false, default: false })
  public isPublic: boolean

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

  @Column({ nullable: true })
  @GraphORM.Field<{}, TestContext>({
    type: GraphQLTestBoolean,
    nullable: false,
    addSelect(sq, ctx, alias) {
      const userLikesPostAlias = '__userLikesPost'
      sq.from(UserLikesPost, userLikesPostAlias)

      if (process.env.TEST_DB_TYPE === 'postgres') {
        sq.select('COUNT(*)')
          .where(`"${userLikesPostAlias}"."userId" = :readerId`, { readerId: ctx.userId })
          .andWhere(`"${userLikesPostAlias}"."postId" = ${alias}.id`)
      } else {
        sq.select('IF (COUNT(*) > 0, TRUE, FALSE)')
          .where(`${userLikesPostAlias}.userId = :readerId`, { readerId: ctx.userId })
          .andWhere(`${userLikesPostAlias}.postId = ${alias}.id`)
      }

      return sq
    }
  })
  public liked?: string

  @OneToMany(() => UserLikesPost, like => like.post)
  public userLikesPosts: UserLikesPost[]
}
