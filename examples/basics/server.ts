import 'reflect-metadata'

import * as path from 'path'
import dotenv from 'dotenv'
import { ApolloServer } from 'apollo-server'
import {
  Column,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  createConnection,
  ManyToMany,
} from 'typeorm'
import {
  NexusEntity,
  nexusTypeORMPlugin,
  entityType,
  FindManyResolveFnContext,
} from 'nexus-typeorm-plugin'
import { queryType, makeSchema } from 'nexus'
import { propertyPathToAlias } from 'nexus-typeorm-plugin/dist/query-builder'

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

  @ManyToMany(() => Category, category => category.posts)
  public categories?: Category[]

  constructor(name: string, age: number, posts: Post[], categories?: Category[]) {
    this.name = name
    this.age = age
    this.posts = posts
    this.categories = categories
  }
}

@NexusEntity()
class Category {
  @PrimaryGeneratedColumn()
  public id!: number

  @Column()
  public name: string

  @ManyToMany(() => Post, post => post.categories)
  public posts?: Post[]

  constructor(name: string, posts?: Post[]) {
    this.name = name
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

  @ManyToMany(() => Category, category => category.posts)
  public categories?: Category[]

  constructor(title: string, author: User, categories?: Category[]) {
    this.title = title
    this.author = author
    this.categories = categories
  }
}

const { DB_HOST, DB_TYPE, DB_NAME, DB_USERNAME, DB_PASSWORD, DB_PORT } = process.env

async function main() {
  await createConnection({
    entities: [User, Post, Category],
    host: DB_HOST,
    type: DB_TYPE as 'postgres',
    database: DB_NAME,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    port: DB_PORT ? parseInt(DB_PORT as any, 10) : undefined,
    synchronize: true,
  })

  const query = queryType({
    definition: t => {
      t.crud.posts()
      t.crud.users('listUsers')
      t.crud.users('listUsersWithNameJohn', {
        resolve: (ctx: FindManyResolveFnContext<User, User, any, any>) => {
          ctx.args.where = {
            ...ctx.args.where,
            name: 'John',
          }

          return ctx.next(ctx)
        },
      })
      t.crudField('listPostsWithCategoryFoo', {
        entity: 'Post',
        type: 'Post',
        method: 'findMany',
        resolve: ctx => {
          return ctx.next({
            ...ctx,
            queryBuilderConfig: config => ({
              ...config,
              joins: [
                ...(config.joins || []),
                {
                  type: 'inner',
                  select: false,
                  propertyPath: 'categories',
                  where: {
                    expression: `${propertyPathToAlias('categories')}.id = :id`,
                    params: { id: 1 },
                  },
                },
              ],
            }),
          })
        },
      })
    },
  })

  const schema = makeSchema({
    types: [nexusTypeORMPlugin(), query, entityType(User), entityType(Post), entityType(Category)],
    outputs: {
      schema: path.resolve('generated', 'schema.graphql'),
      typegen: path.resolve('generated', 'nexus-typegen.ts'),
    },
  })
  new ApolloServer({ schema }).listen(3000)
  // eslint-disable-next-line no-console
  console.log('Server running at http://localhost:3000')
}

main().catch(error => {
  // eslint-disable-next-line no-console
  console.error(error)
  process.exit(1)
})
