import { PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, Index } from 'typeorm'
import { User } from './user'
import { NexusEntity } from 'src/index'

@NexusEntity()
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  public id!: string

  @Column()
  public displayName: string

  @Column()
  public slug: string

  @Column()
  @Index({ unique: true })
  public userId: string

  @OneToOne(() => User, user => user.profile)
  @JoinColumn()
  public user: User
}
