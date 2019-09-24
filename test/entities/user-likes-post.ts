import { ManyToOne } from 'typeorm'

import { User } from './user'
import { Post } from './post'
import { GraphQLEntity } from '@/index'

@GraphQLEntity({
  tableName: 'UserLIKESpost',
})
export class UserLikesPost {
  @ManyToOne(() => User, { primary: true })
  public user: User

  @ManyToOne(() => Post, { primary: true })
  public post: Post
}
