import 'reflect-metadata'

import * as path from 'path'
import dotenv from 'dotenv'
import { ApolloServer } from 'apollo-server'
import { Column, ManyToOne, OneToMany, PrimaryGeneratedColumn, createConnection } from 'typeorm'
import { NexusEntity, nexusTypeORMPlugin, entityType } from 'nexus-typeorm-plugin'
import { queryType, makeSchema } from 'nexus'

dotenv.config()

@NexusEntity()
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

@NexusEntity()
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

async function main() {
  await createConnection({
    entities: [User, Post],
    host: DB_HOST,
    type: DB_TYPE as 'mysql',
    database: DB_NAME,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    port: DB_PORT ? parseInt(DB_PORT as any, 10) : undefined,
    synchronize: true,
  })

  const query = queryType({
    definition: t => {
      t.paginationField('posts', {
        entity: 'Post',
      })
    },
  })

  const schema = makeSchema({
    types: [nexusTypeORMPlugin(), query, entityType(User), entityType(Post)],
    outputs: {
      schema: path.resolve('schema.graphql'),
      typegen: path.resolve('generated', 'nexus-typegen.ts'),
    },
  })
  const server = new ApolloServer({ schema })

  server.listen(3000)
}

main().catch(error => {
  // eslint-disable-next-line no-console
  console.error(error)
  process.exit(1)
})
