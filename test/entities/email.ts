import { PrimaryGeneratedColumn, OneToOne, Column } from 'typeorm'

import { User } from 'test/entities/user'
import { TypeQLEntity } from 'src/index'

@TypeQLEntity()
export class Email {
  @PrimaryGeneratedColumn()
  public id: number

  @OneToOne(() => User, user => user.email)
  public user: User

  @Column()
  public address: string
}
