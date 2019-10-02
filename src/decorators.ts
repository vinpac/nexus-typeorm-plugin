import * as TypeORM from 'typeorm'
import { EntityOptions } from 'typeorm'

export const typeQLEntityMetadata = Symbol('typeQLEntityMetadata')

export interface TypeQLEntityMetadata extends Omit<TypeQLEntityOptions, 'name'> {
  name: string
}

export function getDatabaseObjectMetadata(target: Function): TypeQLEntityMetadata {
  return Reflect.getMetadata(typeQLEntityMetadata, target) || { name: target.name }
}

export interface TypeQLEntityOptions extends Omit<EntityOptions, 'name'> {
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

export function TypeQLEntity(prevOptions?: TypeQLEntityOptions): ClassDecorator {
  return (...args: Parameters<ClassDecorator>): void => {
    const [target] = args
    decoratedEntities.push(target)
    const options: TypeQLEntityMetadata = {
      ...prevOptions,
      name: (prevOptions && prevOptions.name) || target.name,
    }

    Reflect.defineMetadata(typeQLEntityMetadata, options, target)
    TypeORM.Entity(options && options.tableName, options)(target)
  }
}
