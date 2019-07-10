import { PrimaryGeneratedColumn, OneToOne, Column } from 'typeorm'

import * as GraphORM from '@/index'

import { User } from '__tests__/entities/user'

@GraphORM.DatabaseObjectType()
export class Email {
  @PrimaryGeneratedColumn()
  public id: number

  @OneToOne(() => User, user => user.email)
  public user: User

  @Column()
  public address: string
}
