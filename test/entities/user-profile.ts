import { PrimaryGeneratedColumn, Column, Unique, OneToOne, JoinColumn } from 'typeorm'
import { User } from './user'
import { NexusEntity } from 'src/index'

@NexusEntity()
@Unique('user', ['userId'])
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  public id!: string

  @Column()
  public displayName: string

  @Column()
  public slug: string

  @Column()
  public userId: string

  @OneToOne(() => User, user => user.profile)
  @JoinColumn()
  public user: User
}
