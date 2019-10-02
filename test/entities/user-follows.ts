import { PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm'
import { User } from 'test/entities/user'
import { TypeQLEntity } from 'src/index'

@TypeQLEntity()
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
