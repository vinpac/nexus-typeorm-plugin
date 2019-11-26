
import {
  EntityPropertyColumnDefFieldPublisher,
  EntityPropertyFindOneFieldPublisher,
  EntityPropertyFindManyFieldPublisher,
  CRUDPropertyFindOneFieldPublisher,
  CRUDPropertyFindManyFieldPublisher,
  CRUDPropertyCreateOneFieldPublisher,
  CRUDPropertyUpdateOneFieldPublisher,
  CRUDPropertyUpdateManyFieldPublisher
} from 'nexus-typeorm-plugin'

declare global {
  export interface NexusTypeORMEntities {
    'User': {
      id: number
      name: string
      age: number
      posts: NexusTypeORMEntity<'Post'>[]| null
    }
    'Category': {
      id: number
      name: string
      posts: NexusTypeORMEntity<'Post'>[]| null
    }
    'Post': {
      id: number
      title: string
      authorId: number
      author: NexusTypeORMEntity<'User'>| null
      categories: NexusTypeORMEntity<'Category'>[]| null
    }
  }

  export interface NexusTypeORMCRUDPropertyMap {
    'Mutation': {
      createOneUser: CRUDPropertyCreateOneFieldPublisher<NexusTypeORMEntity<'User'>>
      updateOneUser: CRUDPropertyUpdateOneFieldPublisher<NexusTypeORMEntity<'User'>>
      updateManyUsers: CRUDPropertyUpdateManyFieldPublisher<NexusTypeORMEntity<'User'>>
      createOneCategory: CRUDPropertyCreateOneFieldPublisher<NexusTypeORMEntity<'Category'>>
      updateOneCategory: CRUDPropertyUpdateOneFieldPublisher<NexusTypeORMEntity<'Category'>>
      updateManyCategories: CRUDPropertyUpdateManyFieldPublisher<NexusTypeORMEntity<'Category'>>
      createOnePost: CRUDPropertyCreateOneFieldPublisher<NexusTypeORMEntity<'Post'>>
      updateOnePost: CRUDPropertyUpdateOneFieldPublisher<NexusTypeORMEntity<'Post'>>
      updateManyPosts: CRUDPropertyUpdateManyFieldPublisher<NexusTypeORMEntity<'Post'>>
    }
    'Query': {
      user: CRUDPropertyFindOneFieldPublisher<NexusTypeORMEntity<'User'>>
      users: CRUDPropertyFindManyFieldPublisher<NexusTypeORMEntity<'User'>>
      category: CRUDPropertyFindOneFieldPublisher<NexusTypeORMEntity<'Category'>>
      categories: CRUDPropertyFindManyFieldPublisher<NexusTypeORMEntity<'Category'>>
      post: CRUDPropertyFindOneFieldPublisher<NexusTypeORMEntity<'Post'>>
      posts: CRUDPropertyFindManyFieldPublisher<NexusTypeORMEntity<'Post'>>
    }
  }

  export interface NexusTypeORMEntityPropertyMap {
    'User': {
      id: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'User'>>
      name: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'User'>>
      age: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'User'>>
      posts: EntityPropertyFindManyFieldPublisher<NexusTypeORMEntity<'Post'>>
    }
    'Category': {
      id: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'Category'>>
      name: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'Category'>>
      posts: EntityPropertyFindManyFieldPublisher<NexusTypeORMEntity<'Post'>>
    }
    'Post': {
      id: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'Post'>>
      title: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'Post'>>
      authorId: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'Post'>>
      author: EntityPropertyFindOneFieldPublisher<NexusTypeORMEntity<'User'>>
      categories: EntityPropertyFindManyFieldPublisher<NexusTypeORMEntity<'Category'>>
    }
  }

  export type NexusTypeORMEntityProperty<TypeName> =
    TypeName extends keyof NexusTypeORMEntityPropertyMap
      ? NexusTypeORMEntityPropertyMap[TypeName]
      : undefined

  export type NexusTypeORMCRUDProperty<TypeName> = TypeName extends 'Mutation'
    ? NexusTypeORMCRUDPropertyMap['Mutation']
    : NexusTypeORMCRUDPropertyMap['Query']

  export type NexusTypeORMEntity<
    TypeName
  > = TypeName extends keyof NexusTypeORMEntities ? NexusTypeORMEntities[TypeName] : undefined

  export type NexusTypeORMEntityFieldsOutputMethod<TypeName> =
    TypeName extends keyof NexusTypeORMEntityPropertyMap
      ? (() => void)
      : undefined
}
