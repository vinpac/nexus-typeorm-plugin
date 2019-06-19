import { ManyToOne } from 'typeorm'

import * as GraphORM from '@/index'

import { User } from './user'
import { Post } from './post'

@GraphORM.DatabaseObjectType()
export class UserLikesPost {
  @ManyToOne(() => User, { primary: true })
  public user: User

  @ManyToOne(() => Post, { primary: true })
  public post: Post
}
