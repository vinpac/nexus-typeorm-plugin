import { Column, OneToMany, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm'

import { NexusEntity } from 'src/index'

import { Post } from 'test/entities/post'
import { UserLikesPost } from 'test/entities/user-likes-post'
import { Email } from 'test/entities/email'
import { UserFollows } from 'test/entities/user-follows'
import { UserProfile } from './user-profile'

export enum UserType {
  ADMIN = 'ADMIN',
  NORMAL = 'NORMAL',
}

@NexusEntity({ tableName: 'User' })
export class User {
  @PrimaryGeneratedColumn()
  public id: number

  @Column()
  public name: string

  @Column({ nullable: true })
  public age: number

  @Column({ enum: UserType, type: 'enum', default: UserType.NORMAL })
  public type: UserType

  @OneToMany(() => Post, post => post.user)
  public posts: Post[]

  @OneToMany(() => UserFollows, follow => follow.followee)
  public followees: UserFollows[]

  @OneToMany(() => UserLikesPost, like => like.user)
  public userLikesPosts: UserLikesPost[]

  @OneToOne(() => Email, email => email.user, { nullable: true })
  @JoinColumn()
  public email?: Email

  @OneToOne(() => UserProfile, profile => profile.user, { nullable: true })
  public profile?: UserProfile
}
