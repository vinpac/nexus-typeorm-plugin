import 'reflect-metadata'

import TypeQL, { GraphEntity } from '@typeql/core'
import dotenv from 'dotenv'
import { ApolloServer } from 'apollo-server'
import { Column, ManyToOne, OneToMany, PrimaryGeneratedColumn, createConnection } from 'typeorm'

dotenv.config()

@TypeQLEntity()
export class User {
  @PrimaryGeneratedColumn()
  public id!: number

  @Column()
  public name: string

  @Column()
  public age: number

  @OneToMany(() => Post, post => post.author)
  public posts: Post[]

  constructor(name: string, age: number, posts: Post[]) {
    this.name = name
    this.age = age
    this.posts = posts
  }
}

@TypeQLEntity()
class Post {
  @PrimaryGeneratedColumn()
  public id!: number

  @Column()
  public title: string

  @ManyToOne(() => User, user => user.posts)
  public author: User

  constructor(title: string, author: User) {
    this.title = title
    this.author = author
  }
}

const { DB_HOST, DB_TYPE, DB_NAME, DB_USERNAME, DB_PASSWORD, DB_PORT } = process.env

createConnection({
  entities: [User, Post],
  host: DB_HOST,
  type: DB_TYPE as 'mysql',
  database: DB_NAME,
  username: DB_USERNAME,
  password: DB_PASSWORD,
  port: DB_PORT ? parseInt(DB_PORT as any, 10) : undefined,
  synchronize: true,
})
  .then(() => {
    const nexus = TypeQL.build()

    nexus
      .type('Query')
      .field('posts', {
        type: 'Post',
        kind: 'pagination',
      })
      .field('users', {
        type: 'User',
        kind: 'pagination',
      })
      .field('usersConnection', {
        type: 'User',
        kind: 'connection',
      })

    nexus.type('User').field(
      'friends',
      paginationField({
        itemType: 'User',
        resolve: (source, args, info, next) => {
          return next(source, { ...args, where: { ...args.where, id: 1 } }, info, next)
        },
      }),
    )

    server.listen(3000)
  })
  .catch(error => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exit(1)
  })
