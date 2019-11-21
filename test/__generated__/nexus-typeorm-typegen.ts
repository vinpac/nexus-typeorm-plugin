import {
  EntityPropertyColumnDefFieldPublisher,
  EntityPropertyFindOneFieldPublisher,
  EntityPropertyFindManyFieldPublisher,
  CRUDPropertyFindOneFieldPublisher,
  CRUDPropertyFindManyFieldPublisher,
  CRUDPropertyCreateOneFieldPublisher,
} from '../../src'

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
      createOneUserLikesPost: CRUDPropertyCreateOneFieldPublisher<
        NexusTypeORMEntity<'UserLikesPost'>
      >
      createOneCategory: CRUDPropertyCreateOneFieldPublisher<NexusTypeORMEntity<'Category'>>
      createOnePost: CRUDPropertyCreateOneFieldPublisher<NexusTypeORMEntity<'Post'>>
      createOneEmail: CRUDPropertyCreateOneFieldPublisher<NexusTypeORMEntity<'Email'>>
      createOneUserFollows: CRUDPropertyCreateOneFieldPublisher<NexusTypeORMEntity<'UserFollows'>>
      createOneUserProfile: CRUDPropertyCreateOneFieldPublisher<NexusTypeORMEntity<'UserProfile'>>
      createOneUser: CRUDPropertyCreateOneFieldPublisher<NexusTypeORMEntity<'User'>>
    }
    Query: {
      userLikesPost: CRUDPropertyFindOneFieldPublisher<NexusTypeORMEntity<'UserLikesPost'>>
      userLikesPosts: CRUDPropertyFindManyFieldPublisher<NexusTypeORMEntity<'UserLikesPost'>>
      category: CRUDPropertyFindOneFieldPublisher<NexusTypeORMEntity<'Category'>>
      categories: CRUDPropertyFindManyFieldPublisher<NexusTypeORMEntity<'Category'>>
      post: CRUDPropertyFindOneFieldPublisher<NexusTypeORMEntity<'Post'>>
      posts: CRUDPropertyFindManyFieldPublisher<NexusTypeORMEntity<'Post'>>
      email: CRUDPropertyFindOneFieldPublisher<NexusTypeORMEntity<'Email'>>
      emails: CRUDPropertyFindManyFieldPublisher<NexusTypeORMEntity<'Email'>>
      userFollows: CRUDPropertyFindManyFieldPublisher<NexusTypeORMEntity<'UserFollows'>>
      userProfile: CRUDPropertyFindOneFieldPublisher<NexusTypeORMEntity<'UserProfile'>>
      userProfiles: CRUDPropertyFindManyFieldPublisher<NexusTypeORMEntity<'UserProfile'>>
      user: CRUDPropertyFindOneFieldPublisher<NexusTypeORMEntity<'User'>>
      users: CRUDPropertyFindManyFieldPublisher<NexusTypeORMEntity<'User'>>
    }
  }

  export interface NexusTypeORMEntityPropertyMap {
    UserLikesPost: {
      id: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'UserLikesPost'>>
      userId: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'UserLikesPost'>>
      postId: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'UserLikesPost'>>
      user: EntityPropertyFindOneFieldPublisher<NexusTypeORMEntity<'User'>>
      post: EntityPropertyFindOneFieldPublisher<NexusTypeORMEntity<'Post'>>
    }
    Category: {
      id: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'Category'>>
      name: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'Category'>>
      posts: EntityPropertyFindManyFieldPublisher<NexusTypeORMEntity<'Post'>>
    }
    Post: {
      id: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'Post'>>
      title: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'Post'>>
      isPublic: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'Post'>>
      viewCount: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'Post'>>
      userId: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'Post'>>
      createdAt: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'Post'>>
      totalLikes: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'Post'>>
      liked: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'Post'>>
      user: EntityPropertyFindOneFieldPublisher<NexusTypeORMEntity<'User'>>
      userLikesPosts: EntityPropertyFindManyFieldPublisher<NexusTypeORMEntity<'UserLikesPost'>>
      categories: EntityPropertyFindManyFieldPublisher<NexusTypeORMEntity<'Category'>>
    }
    Email: {
      id: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'Email'>>
      address: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'Email'>>
      user: EntityPropertyFindOneFieldPublisher<NexusTypeORMEntity<'User'>>
    }
    UserFollows: {
      id: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'UserFollows'>>
      followerId: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'UserFollows'>>
      followeeId: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'UserFollows'>>
      follower: EntityPropertyFindOneFieldPublisher<NexusTypeORMEntity<'User'>>
      followee: EntityPropertyFindOneFieldPublisher<NexusTypeORMEntity<'User'>>
    }
    UserProfile: {
      id: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'UserProfile'>>
      displayName: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'UserProfile'>>
      slug: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'UserProfile'>>
      userId: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'UserProfile'>>
      user: EntityPropertyFindOneFieldPublisher<NexusTypeORMEntity<'User'>>
    }
    User: {
      id: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'User'>>
      name: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'User'>>
      age: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'User'>>
      type: EntityPropertyColumnDefFieldPublisher<NexusTypeORMEntity<'User'>>
      email: EntityPropertyFindOneFieldPublisher<NexusTypeORMEntity<'Email'>>
      posts: EntityPropertyFindManyFieldPublisher<NexusTypeORMEntity<'Post'>>
      followees: EntityPropertyFindManyFieldPublisher<NexusTypeORMEntity<'UserFollows'>>
      userLikesPosts: EntityPropertyFindManyFieldPublisher<NexusTypeORMEntity<'UserLikesPost'>>
      profile: EntityPropertyFindOneFieldPublisher<NexusTypeORMEntity<'UserProfile'>>
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
