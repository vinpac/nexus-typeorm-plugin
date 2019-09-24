import * as TypeORM from 'typeorm'
import { EntityOptions } from 'typeorm'

export const graphQLEntityMetadata = Symbol('graphQLEntityMetadata')

export interface GraphQLEntityMetadata extends Omit<GraphQLEntityOptions, 'name'> {
  name: string
}

export function getDatabaseObjectMetadata(target: Function): GraphQLEntityMetadata {
  return Reflect.getMetadata(graphQLEntityMetadata, target) || { name: target.name }
}

export interface GraphQLEntityOptions extends Omit<EntityOptions, 'name'> {
  name?: string
  tableName?: string
  typeDefsEnabled?: boolean
  queryFieldsEnabled?: boolean
  // Defines in schema a field that returns one instance of a model
  // e.g: type Query { user(where: UserWhereInput!): User }
  queryUniqueField?: {
    name?: string
    typeName?: string
    enabled?: boolean
  }
  // Defines in schema a field that returns a list of instances of a model
  // e.g: type Query {
  //   users(
  //     first: Int
  //     last: Int
  //     skip: Int
  //     after: String
  //     before: String
  //     orderBy: [UserOrderInput]
  //     where: UserWhereInput
  //   ): [User!]!
  // }
  queryPaginationField?: {
    name?: string
    typeName?: string
    enabled?: boolean
  }
  // Defines in schema a field that returns a list of instances of a model
  // e.g:
  // type UserConnectionEdge {
  //   node: User!
  //   cursor: String
  // }
  //
  // type UserConnection {
  //   edges: [UserConnectionEdge!]!
  //   totalCount: Int
  // }
  //
  // type Query {
  //   users(
  //     first: Int
  //     last: Int
  //     skip: Int
  //     after: String
  //     before: String
  //     orderBy: [UserOrderInput]
  //     where: UserWhereInput
  //   ): [User!]!
  // }
  queryConnectionField?: {
    name?: string
    typeName?: string
    enabled?: boolean
  }
}

const decoratedEntities: Function[] = []
export function getDecoratedEntities(): Function[] {
  return decoratedEntities
}

export function GraphQLEntity(prevOptions?: GraphQLEntityOptions): ClassDecorator {
  return (...args: Parameters<ClassDecorator>): void => {
    const [target] = args
    decoratedEntities.push(target)
    const options: GraphQLEntityMetadata = {
      ...prevOptions,
      name: (prevOptions && prevOptions.name) || target.name,
    }

    Reflect.defineMetadata(graphQLEntityMetadata, options, target)
    TypeORM.Entity(options && options.tableName, options)(target)
  }
}
