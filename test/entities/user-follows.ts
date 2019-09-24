import { PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm'
import { User } from 'test/entities/user'
import { GraphQLEntity } from 'src/index'

@GraphQLEntity()
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
