# nexus-typeorm-plugin

Create a [GraphQL.js](https://github.com/graphql/graphql-js) schema from your [TypeORM](https://github.com/typeorm/typeorm) Entities with integrated [dataloader](https://github.com/graphql/dataloader) support.

## Usage

Here's example [Apollo Server](https://github.com/apollographql/apollo-server) with a `posts` resolver to paginate over the `Post` entity.

```typescript
import 'reflect-metadata'

import * as path from 'path'
import { ApolloServer } from 'apollo-server'
import { Column, ManyToOne, OneToMany, PrimaryGeneratedColumn, createConnection } from 'typeorm'
import { NexusEntity, nexusTypeORMPlugin, entityType } from 'nexus-typeorm-plugin'
import { queryType, makeSchema } from 'nexus'

// First we define our entities
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

async function main() {
  await createConnection({
    entities: [User, Post],
    host: 'localhost',
    type: 'mysql',
    database: 'nexus-typeorm',
    username: 'root',
    password: '',
    port: 3306,
    synchronize: true,
  })

  // Define the Query type for our schema
  const query = queryType({
    definition: t => {
      t.paginationField('posts', {
        entity: 'Post',
      })
    },
  })

  const schema = makeSchema({
    // It's important to notice that even though we didn't create an resolver for User in Query. We have to define it in our schema since it's related to Post entity
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
  console.error(error)
  process.exit(1)
})
```

## Features

### entityType

Helps you create an `objectType` for an entity faster and simpler.

```typescript
export const User = entityType<User>(User, {
  definition: t => {
    t.entityField('id')
    t.entityField('name')
    t.paginationField('followers', {
      type: 'User',
      entity: 'UserFollows',
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

### paginationField

Creates a field that resolves into a list of instances of the choosen entity. It includes the `first`, `last`, `after`, `before`, `skip`, `where`, and the `orderBy` arguments.

```typescript
export const Query = queryType({
  definition(t) {
    t.paginationField('posts', {
      entity: 'Post',
    })
  },
})
```

### uniqueField

Creates a field that resolves into one entity instance. It includes the `where` and the `orderBy` arguments.

```typescript
export const Query = queryType({
  definition(t) {
    t.uniqueField('user', {
      entity: 'User',
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
