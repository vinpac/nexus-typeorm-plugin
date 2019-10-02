import {
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm'

import { User } from 'test/entities/user'
import { UserLikesPost } from 'test/entities/user-likes-post'
import { TypeQLEntity } from 'src/index'

@TypeQLEntity()
export class Post {
  @PrimaryGeneratedColumn()
  public id: number

  @Column()
  public title: string

  @Column({ nullable: false, default: false })
  public isPublic: boolean

  @Column({ nullable: true })
  public viewCount?: number

  @ManyToOne(() => User, user => user.posts, { nullable: false })
  public user: User

  @Column({ nullable: true })
  public userId: number

  @CreateDateColumn()
  public createdAt: Date

  @Column({ nullable: true })
  public totalLikes?: number

  @Column({ nullable: true })
  public liked?: string

  @OneToMany(() => UserLikesPost, like => like.post)
  @JoinColumn()
  public userLikesPosts: UserLikesPost[]
}
