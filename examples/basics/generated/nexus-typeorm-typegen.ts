import {
  ColumnEntityOutputMethodConfig,
  UniqueEntityOutputMethodConfig,
  PaginationEntityOutputMethodConfig,
  CRUDFindOneMethod,
  CRUDFindManyMethod,
  CRUDCreateOneMethod,
} from 'nexus-typeorm-plugin/nexus'

interface EntityFieldPublisher<TConfig> {
  (config?: TConfig): void
}

declare global {
  export interface NexusTypeORMEntities {
    User: {
      id: number
      name: string
      age: number
      posts: NexusTypeORMEntity<'Post'>[] | null
      categories: NexusTypeORMEntity<'Category'>[] | null
    }
    Category: {
      id: number
      name: string
      posts: NexusTypeORMEntity<'Post'>[] | null
    }
    Post: {
      id: number
      title: string
      author: NexusTypeORMEntity<'User'> | null
      categories: NexusTypeORMEntity<'Category'>[] | null
    }
  }

  export interface NexusTypeORMCRUDPropertyMap {
    Mutation: {
      createOneUser: CRUDCreateOneMethod<NexusTypeORMEntity<'User'>>
      createOneCategory: CRUDCreateOneMethod<NexusTypeORMEntity<'Category'>>
      createOnePost: CRUDCreateOneMethod<NexusTypeORMEntity<'Post'>>
    }
    Query: {
      user: CRUDFindOneMethod<NexusTypeORMEntity<'User'>>
      users: CRUDFindManyMethod<NexusTypeORMEntity<'User'>>
      category: CRUDFindOneMethod<NexusTypeORMEntity<'Category'>>
      categories: CRUDFindManyMethod<NexusTypeORMEntity<'Category'>>
      post: CRUDFindOneMethod<NexusTypeORMEntity<'Post'>>
      posts: CRUDFindManyMethod<NexusTypeORMEntity<'Post'>>
    }
  }

  export interface NexusTypeORMEntityPropertyMap {
    User: {
      id: EntityFieldPublisher<ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'User'>, any>>
      name: EntityFieldPublisher<ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'User'>, any>>
      age: EntityFieldPublisher<ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'User'>, any>>
      posts: EntityFieldPublisher<PaginationEntityOutputMethodConfig<NexusTypeORMEntity<'Post'>>>
      categories: EntityFieldPublisher<
        PaginationEntityOutputMethodConfig<NexusTypeORMEntity<'Category'>>
      >
    }
    Category: {
      id: EntityFieldPublisher<ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'Category'>, any>>
      name: EntityFieldPublisher<
        ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'Category'>, any>
      >
      posts: EntityFieldPublisher<PaginationEntityOutputMethodConfig<NexusTypeORMEntity<'Post'>>>
    }
    Post: {
      id: EntityFieldPublisher<ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'Post'>, any>>
      title: EntityFieldPublisher<ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'Post'>, any>>
      author: EntityFieldPublisher<UniqueEntityOutputMethodConfig<NexusTypeORMEntity<'User'>>>
      categories: EntityFieldPublisher<
        PaginationEntityOutputMethodConfig<NexusTypeORMEntity<'Category'>>
      >
    }
  }

  export type NexusTypeORMEntityProperty<
    TypeName
  > = TypeName extends keyof NexusTypeORMEntityPropertyMap
    ? NexusTypeORMEntityPropertyMap[TypeName]
    : undefined
  export type NexusTypeORMCRUDProperty<TypeName> = TypeName extends 'Mutation'
    ? NexusTypeORMCRUDPropertyMap['Mutation']
    : NexusTypeORMCRUDPropertyMap['Query']
  export type NexusTypeORMEntity<TypeName> = TypeName extends keyof NexusTypeORMEntities
    ? NexusTypeORMEntities[TypeName]
    : undefined
}
