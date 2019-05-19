# type-graph-orm

Simple integration between [TypeORM](https://github.com/typeorm/typeorm) and [TypeGraphQL](https://github.com/19majkel94/type-graphql).

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
import { buildSchema } from 'type-graphql'

// Define TypeORM entities
@GraphORM.DatabaseObjectType()
export class User {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  public id: number

  @Field(() => String)
  @Column()
  public name: string

  @Field(() => Int)
  @Column()
  public age: number

  @Field(() => [Post])
  @OneToMany(() => Post, post => post.user)
  public posts: Post[]
}

@GraphORM.DatabaseObjectType()
class Post {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  public id: number

  @Field(() => String)
  @Column()
  public title: string

  @Field(() => User)
  @ManyToOne(() => User, user => user.posts)
  public user: User
}

// Define type-graphql resolvers
@GraphORM.Resolver({
  queryName: 'users',
  typeFunction: () => User,
})
export class UserResolver {
}

@GraphORM.Resolver({
  queryName: 'posts',
  typeFunction: () => Post,
})
export class PostResolver {
}

// Create executable schema
const schema = await buildSchema({
  resolvers: [
    UserResolver,
    PostResolver,
  ],
})

// Run query!
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
}`)
```

## Notes

Implementation is now at experimental stage. It's currently tested on the simplest cases.
