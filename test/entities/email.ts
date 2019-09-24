import { PrimaryGeneratedColumn, OneToOne, Column } from 'typeorm'

import { User } from 'test/entities/user'
import { GraphQLEntity } from '@/index'

@GraphQLEntity()
export class Email {
  @PrimaryGeneratedColumn()
  public id: number

  @OneToOne(() => User, user => user.email)
  public user: User

  @Column()
  public address: string
}
