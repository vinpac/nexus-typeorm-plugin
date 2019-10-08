import { ManyToOne, PrimaryGeneratedColumn, Unique, Column } from 'typeorm'

import { User } from './user'
import { Post } from './post'
import { NexusEntity } from 'src/index'

@NexusEntity({
  tableName: 'UserLIKESpost',
})
@Unique(['user', 'post'])
export class UserLikesPost {
  @PrimaryGeneratedColumn()
  public id: number

  @ManyToOne(() => User, user => user.posts)
  public user: User

  @Column()
  public userId: string

  @ManyToOne(() => Post, post => post.userLikesPosts)
  public post: Post

  @Column()
  public postId: string
}
