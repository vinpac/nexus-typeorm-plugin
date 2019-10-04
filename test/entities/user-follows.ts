import { PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column } from 'typeorm'
import { User } from 'test/entities/user'
import { NexusEntity } from 'src/index'

@NexusEntity()
export class UserFollows {
  @PrimaryGeneratedColumn()
  public id: number

  @ManyToOne(() => User, user => user.followees, { nullable: false })
  @JoinColumn()
  public follower: User

  @Column()
  public followerId: number

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn()
  public followee: User

  @Column()
  public followeeId: number
}
