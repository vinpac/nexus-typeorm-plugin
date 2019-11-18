# nexus-typeorm-plugin

Create a [GraphQL.js](https://github.com/graphql/graphql-js) schema from your [TypeORM](https://github.com/typeorm/typeorm) Entities with integrated [dataloader](https://github.com/graphql/dataloader) support.

## Usage

Here's example [Apollo Server](https://github.com/apollographql/apollo-server) with a `posts` resolver to paginate over the `Post` entity.

```typescript
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
  console.log('Server running at http://localhost:3000')
}

main().catch(error => {
  // eslint-disable-next-line no-console
  console.error(error)
  process.exit(1)
})
```

## Features

### Entity field definition

Helps you create an `objectType` for an entity faster and simpler.

```typescript
export const User = entityType<User>(User, {
  definition: t => {
    t.entity.id()
    // Either t.entityField('name') or
    t.entity.name()

    // Either t.crudField('followers', { entity: 'UserFollow', ... or
    t.crud.userFollows('followers', {
      type: 'User',
      resolve: async (source: User, args, ctx, info, next) => {
        const follows = await next(source, args, ctx, info)

        return getConnection()
          .getRepository(User)
          .createQueryBuilder()
          .where('id IN (:...ids)', {
            ids: follows.map((follow: UserFollows) => follow.followerId),
          })
          .getMany()
      },
    })
  },
})
```

# CRUD

## Find Many

Creates a field that resolves into a list of instances of the choosen entity. It includes the `first`, `last`, `after`, `before`, `skip`, `where`, and the `orderBy` arguments.

```typescript
export const Query = queryType({
  definition(t) {
    t.crud.posts()
    t.crud.users('listUsers')
    t.crud.users('listUsersWithNameJohn', {
      resolve: ctx => {
        ctx.args.where = {
          ...ctx.args.where,
          name: 'John',
        }

        return ctx.next(ctx)
      },
    })
    t.crudField('listPostsWithCategoryFoo', {
      entity: 'Post',
      method: 'findMany',
      resolve: ctx => {
        return ctx.next({
          ...ctx,
          queryBuilderConfig: config => ({
            ...config,
            joins: [
              ...config.joins,
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
```

### Find One

Creates a field that resolves into one entity instance. It includes the `where` and the `orderBy` arguments.

```typescript
export const Query = queryType({
  definition(t) {
    t.crud.user()
    t.crud.post()
    t.crud.post('postsByUserId', {
      args: args => ({ ...args, userId: stringArg({ nullable: false }) }),
      resolve: ctx =>
        ctx.next({
          ...ctx,
          args: { ...ctx.args, where: { ...ctx.args.where, userId: ctx.args.userId } },
        }),
    })
  },
})
```

### Auto join

In order to speed up requests and decrease the number of queries made to the database, this plugin analyzes each graphql query and makes the necessary joins automatically.

```gql
{
  user {
    id
    posts {
      id
    }
  }
}
```

Generates a SQL query that left joins Post.

```SQL
SELECT * from User ... LEFT JOIN POST
```

Checkout the `tests/` directory to see examples.

## Contributing

To run tests create `.env` file at the project root and fill it with database information.

```bash
TEST_DB_HOST=localhost
TEST_DB_TYPE=mysql
TEST_DB_NAME=test
TEST_DB_USERNAME=root
TEST_DB_PASSWORD=mypassword
TEST_DB_PORT=3316
```

If you want, you can run a Docker container of MySQL for test based on `.env` file.

```bash
docker-compose up -d
```

Now you can run tests.

```bash
yarn test
```
