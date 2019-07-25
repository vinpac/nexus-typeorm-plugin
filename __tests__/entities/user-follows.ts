import * as GraphORM from '@/index'

import { PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm'
import { User } from '__tests__/entities/user'

@GraphORM.DatabaseObjectType()
export class UserFollows {
  @PrimaryGeneratedColumn()
  public id: number

  @ManyToOne(() => User, user => user.followees, { nullable: false })
  @JoinColumn()
  public user: User

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn()
  public peer: User
}
