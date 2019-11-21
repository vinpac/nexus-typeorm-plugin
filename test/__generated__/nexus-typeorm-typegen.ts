import {
  ColumnEntityOutputMethodConfig,
  UniqueEntityOutputMethodConfig,
  PaginationEntityOutputMethodConfig,
  CRUDFindOneMethod,
  CRUDFindManyMethod,
  CRUDCreateOneMethod,
} from '../../src/nexus/typings'

interface EntityFieldPublisher<TConfig> {
  (config?: TConfig): void
}

declare global {
  export interface NexusTypeORMEntities {
    UserLikesPost: {
      id: number
      userId: number
      postId: number
      user: NexusTypeORMEntity<'User'> | null
      post: NexusTypeORMEntity<'Post'> | null
    }
    Category: {
      id: number
      name: string
      posts: NexusTypeORMEntity<'Post'>[] | null
    }
    Post: {
      id: number
      title: string
      isPublic: boolean
      viewCount: number | null
      userId: number | null
      createdAt: string
      totalLikes: number | null
      liked: string | null
      user: NexusTypeORMEntity<'User'>
      userLikesPosts: NexusTypeORMEntity<'UserLikesPost'>[] | null
      categories: NexusTypeORMEntity<'Category'>[] | null
    }
    Email: {
      id: number
      address: string
      user: NexusTypeORMEntity<'User'> | null
    }
    UserFollows: {
      id: number
      followerId: number
      followeeId: number
      follower: NexusTypeORMEntity<'User'>
      followee: NexusTypeORMEntity<'User'>
    }
    UserProfile: {
      id: string
      displayName: string
      slug: string
      userId: number
      user: NexusTypeORMEntity<'User'> | null
    }
    User: {
      id: number
      name: string
      age: number | null
      type: 'ADMIN' | 'NORMAL'
      email: NexusTypeORMEntity<'Email'> | null
      posts: NexusTypeORMEntity<'Post'>[] | null
      followees: NexusTypeORMEntity<'UserFollows'>[] | null
      userLikesPosts: NexusTypeORMEntity<'UserLikesPost'>[] | null
      profile: NexusTypeORMEntity<'UserProfile'> | null
    }
  }

  export interface NexusTypeORMCRUDPropertyMap {
    Mutation: {
      createOneUserLikesPost: CRUDCreateOneMethod<NexusTypeORMEntity<'UserLikesPost'>>
      createOneCategory: CRUDCreateOneMethod<NexusTypeORMEntity<'Category'>>
      createOnePost: CRUDCreateOneMethod<NexusTypeORMEntity<'Post'>>
      createOneEmail: CRUDCreateOneMethod<NexusTypeORMEntity<'Email'>>
      createOneUserFollows: CRUDCreateOneMethod<NexusTypeORMEntity<'UserFollows'>>
      createOneUserProfile: CRUDCreateOneMethod<NexusTypeORMEntity<'UserProfile'>>
      createOneUser: CRUDCreateOneMethod<NexusTypeORMEntity<'User'>>
    }
    Query: {
      userLikesPost: CRUDFindOneMethod<NexusTypeORMEntity<'UserLikesPost'>>
      userLikesPosts: CRUDFindManyMethod<NexusTypeORMEntity<'UserLikesPost'>>
      category: CRUDFindOneMethod<NexusTypeORMEntity<'Category'>>
      categories: CRUDFindManyMethod<NexusTypeORMEntity<'Category'>>
      post: CRUDFindOneMethod<NexusTypeORMEntity<'Post'>>
      posts: CRUDFindManyMethod<NexusTypeORMEntity<'Post'>>
      email: CRUDFindOneMethod<NexusTypeORMEntity<'Email'>>
      emails: CRUDFindManyMethod<NexusTypeORMEntity<'Email'>>
      userFollows: CRUDFindManyMethod<NexusTypeORMEntity<'UserFollows'>>
      userProfile: CRUDFindOneMethod<NexusTypeORMEntity<'UserProfile'>>
      userProfiles: CRUDFindManyMethod<NexusTypeORMEntity<'UserProfile'>>
      user: CRUDFindOneMethod<NexusTypeORMEntity<'User'>>
      users: CRUDFindManyMethod<NexusTypeORMEntity<'User'>>
    }
  }

  export interface NexusTypeORMEntityPropertyMap {
    UserLikesPost: {
      id: EntityFieldPublisher<
        ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'UserLikesPost'>, any>
      >
      userId: EntityFieldPublisher<
        ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'UserLikesPost'>, any>
      >
      postId: EntityFieldPublisher<
        ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'UserLikesPost'>, any>
      >
      user: EntityFieldPublisher<UniqueEntityOutputMethodConfig<NexusTypeORMEntity<'User'>>>
      post: EntityFieldPublisher<UniqueEntityOutputMethodConfig<NexusTypeORMEntity<'Post'>>>
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
      isPublic: EntityFieldPublisher<
        ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'Post'>, any>
      >
      viewCount: EntityFieldPublisher<
        ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'Post'>, any>
      >
      userId: EntityFieldPublisher<ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'Post'>, any>>
      createdAt: EntityFieldPublisher<
        ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'Post'>, any>
      >
      totalLikes: EntityFieldPublisher<
        ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'Post'>, any>
      >
      liked: EntityFieldPublisher<ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'Post'>, any>>
      user: EntityFieldPublisher<UniqueEntityOutputMethodConfig<NexusTypeORMEntity<'User'>>>
      userLikesPosts: EntityFieldPublisher<
        PaginationEntityOutputMethodConfig<NexusTypeORMEntity<'UserLikesPost'>>
      >
      categories: EntityFieldPublisher<
        PaginationEntityOutputMethodConfig<NexusTypeORMEntity<'Category'>>
      >
    }
    Email: {
      id: EntityFieldPublisher<ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'Email'>, any>>
      address: EntityFieldPublisher<
        ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'Email'>, any>
      >
      user: EntityFieldPublisher<UniqueEntityOutputMethodConfig<NexusTypeORMEntity<'User'>>>
    }
    UserFollows: {
      id: EntityFieldPublisher<
        ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'UserFollows'>, any>
      >
      followerId: EntityFieldPublisher<
        ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'UserFollows'>, any>
      >
      followeeId: EntityFieldPublisher<
        ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'UserFollows'>, any>
      >
      follower: EntityFieldPublisher<UniqueEntityOutputMethodConfig<NexusTypeORMEntity<'User'>>>
      followee: EntityFieldPublisher<UniqueEntityOutputMethodConfig<NexusTypeORMEntity<'User'>>>
    }
    UserProfile: {
      id: EntityFieldPublisher<
        ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'UserProfile'>, any>
      >
      displayName: EntityFieldPublisher<
        ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'UserProfile'>, any>
      >
      slug: EntityFieldPublisher<
        ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'UserProfile'>, any>
      >
      userId: EntityFieldPublisher<
        ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'UserProfile'>, any>
      >
      user: EntityFieldPublisher<UniqueEntityOutputMethodConfig<NexusTypeORMEntity<'User'>>>
    }
    User: {
      id: EntityFieldPublisher<ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'User'>, any>>
      name: EntityFieldPublisher<ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'User'>, any>>
      age: EntityFieldPublisher<ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'User'>, any>>
      type: EntityFieldPublisher<ColumnEntityOutputMethodConfig<NexusTypeORMEntity<'User'>, any>>
      email: EntityFieldPublisher<UniqueEntityOutputMethodConfig<NexusTypeORMEntity<'Email'>>>
      posts: EntityFieldPublisher<PaginationEntityOutputMethodConfig<NexusTypeORMEntity<'Post'>>>
      followees: EntityFieldPublisher<
        PaginationEntityOutputMethodConfig<NexusTypeORMEntity<'UserFollows'>>
      >
      userLikesPosts: EntityFieldPublisher<
        PaginationEntityOutputMethodConfig<NexusTypeORMEntity<'UserLikesPost'>>
      >
      profile: EntityFieldPublisher<
        UniqueEntityOutputMethodConfig<NexusTypeORMEntity<'UserProfile'>>
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
