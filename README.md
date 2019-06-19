# type-graph-orm

Simple integration between [TypeORM](https://github.com/typeorm/typeorm) and [GraphQL.js](https://github.com/graphql/graphql-js).

```typescript
import * as GraphORM from 'type-graph-orm'
import {
  Column,
  Field,
  Int,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  String,
} from 'typeorm'
import { graphql } from 'graphql'

// Define TypeORM entities
@GraphORM.DatabaseObjectType({
  views: [{
    // API users can directly query `users` field via this *view*.
    isDirectView: true,
    name: 'users'
  }]
})
export class User {
  @PrimaryGeneratedColumn()
  public id: number

  @Column()
  public name: string

  @Column()
  public age: number

  @OneToMany(() => Post, post => post.user)
  public posts: Post[]
}

@GraphORM.DatabaseObjectType()
class Post {
  @PrimaryGeneratedColumn()
  public id: number

  @Column()
  public title: string

  @ManyToOne(() => User, user => user.posts)
  public user: User
}

// Create executable schema
const schema = await buildExecutableSchema({
  entities: [
    User,
    Post,
  ],
})

// Simple query
const result = await graphql(schema, `
  query {
    users {
      id
      name
      age
      posts {
        id
        title
      }
    }
  }`
)

// Complex filters
const result = await graphql(schema, `
  query {
    users(where: {name: "Foo"}) {
      id
      age
      posts(where: {id: 2}) {
        title
      }
    }
  }`
)
```

## Notes
Implementation is now at experimental stage. It's currently tested on the simplest cases.
