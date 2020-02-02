import { PrimaryGeneratedColumn, Column, ManyToMany, Index } from 'typeorm'
import { NexusEntity } from 'src/index'
import { Post } from './post'

@NexusEntity()
export class Category {
  @PrimaryGeneratedColumn()
  public id: number

  @Column()
  @Index({ unique: true })
  name: string

  @ManyToMany(() => Post, post => post.categories)
  posts: Post[]
}
