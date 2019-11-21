/**
 * This file was automatically generated by GraphQL Nexus
 * Do not make changes to this file directly
 */


import { core } from "nexus"

declare global {
  interface NexusGenCustomOutputMethods<TypeName extends string> {
    entityField: NexusTypeORMEntityOutputMethod<NexusTypeORMEntity<TypeName>>
    crudField: NexusTypeORMCRUDMethod<NexusTypeORMEntity<TypeName>>
    entityFields(...args: any): void
  }
}
declare global {
  interface NexusGenCustomOutputProperties<TypeName extends string> {
    entity: NexusTypeORMEntityProperty<TypeName>
    crud: NexusTypeORMCRUDProperty<TypeName>
  }
}

declare global {
  interface NexusGen extends NexusGenTypes {}
}

export interface NexusGenInputs {
  CategoryWhereInput: { // input type
    AND?: NexusGenInputs['CategoryWhereInput'][] | null; // [CategoryWhereInput!]
    id?: string | null; // ID
    id_in?: string[] | null; // [ID!]
    name?: string | null; // String
    name_contains?: string | null; // String
    name_in?: string[] | null; // [String!]
    NOT?: NexusGenInputs['CategoryWhereInput'][] | null; // [CategoryWhereInput!]
    OR?: NexusGenInputs['CategoryWhereInput'][] | null; // [CategoryWhereInput!]
  }
  PostWhereInput: { // input type
    AND?: NexusGenInputs['PostWhereInput'][] | null; // [PostWhereInput!]
    id?: string | null; // ID
    id_in?: string[] | null; // [ID!]
    NOT?: NexusGenInputs['PostWhereInput'][] | null; // [PostWhereInput!]
    OR?: NexusGenInputs['PostWhereInput'][] | null; // [PostWhereInput!]
    title?: string | null; // String
    title_contains?: string | null; // String
    title_in?: string[] | null; // [String!]
  }
  UserWhereInput: { // input type
    age?: number | null; // Int
    age_gt?: number | null; // Int
    age_gte?: number | null; // Int
    age_in?: number[] | null; // [Int!]
    age_lt?: number | null; // Int
    age_lte?: number | null; // Int
    AND?: NexusGenInputs['UserWhereInput'][] | null; // [UserWhereInput!]
    id?: string | null; // ID
    id_in?: string[] | null; // [ID!]
    name?: string | null; // String
    name_contains?: string | null; // String
    name_in?: string[] | null; // [String!]
    NOT?: NexusGenInputs['UserWhereInput'][] | null; // [UserWhereInput!]
    OR?: NexusGenInputs['UserWhereInput'][] | null; // [UserWhereInput!]
  }
}

export interface NexusGenEnums {
  CategoryOrderByInput: "id_ASC" | "id_DESC" | "name_ASC" | "name_DESC"
  PostOrderByInput: "author_ASC" | "author_DESC" | "id_ASC" | "id_DESC" | "title_ASC" | "title_DESC"
  UserOrderByInput: "age_ASC" | "age_DESC" | "id_ASC" | "id_DESC" | "name_ASC" | "name_DESC"
}

export interface NexusGenRootTypes {
  Category: { // root type
    id: string; // ID!
    name: string; // String!
  }
  Post: { // root type
    id: string; // ID!
    title: string; // String!
  }
  Query: {};
  User: { // root type
    age: number; // Int!
    id: string; // ID!
    name: string; // String!
  }
  String: string;
  Int: number;
  Float: number;
  Boolean: boolean;
  ID: string;
  DateTime: any;
}

export interface NexusGenAllTypes extends NexusGenRootTypes {
  CategoryWhereInput: NexusGenInputs['CategoryWhereInput'];
  PostWhereInput: NexusGenInputs['PostWhereInput'];
  UserWhereInput: NexusGenInputs['UserWhereInput'];
  CategoryOrderByInput: NexusGenEnums['CategoryOrderByInput'];
  PostOrderByInput: NexusGenEnums['PostOrderByInput'];
  UserOrderByInput: NexusGenEnums['UserOrderByInput'];
}

export interface NexusGenFieldTypes {
  Category: { // field return type
    id: string; // ID!
    name: string; // String!
    posts: NexusGenRootTypes['Post'][]; // [Post!]!
  }
  Post: { // field return type
    author: NexusGenRootTypes['User']; // User!
    categories: NexusGenRootTypes['Category'][]; // [Category!]!
    id: string; // ID!
    title: string; // String!
  }
  Query: { // field return type
    listPostsWithCategoryFoo: NexusGenRootTypes['Post'][]; // [Post!]!
    listUsers: NexusGenRootTypes['User'][]; // [User!]!
    listUsersWithNameJohn: NexusGenRootTypes['User'][]; // [User!]!
    posts: NexusGenRootTypes['Post'][]; // [Post!]!
  }
  User: { // field return type
    age: number; // Int!
    categories: NexusGenRootTypes['Category'][]; // [Category!]!
    id: string; // ID!
    name: string; // String!
    posts: NexusGenRootTypes['Post'][]; // [Post!]!
  }
}

export interface NexusGenArgTypes {
  Category: {
    posts: { // args
      first?: number | null; // Int
      last?: number | null; // Int
      orderBy?: NexusGenEnums['PostOrderByInput'][] | null; // [PostOrderByInput!]
      skip?: number | null; // Int
      where?: NexusGenInputs['PostWhereInput'] | null; // PostWhereInput
    }
  }
  Post: {
    categories: { // args
      first?: number | null; // Int
      last?: number | null; // Int
      orderBy?: NexusGenEnums['CategoryOrderByInput'][] | null; // [CategoryOrderByInput!]
      skip?: number | null; // Int
      where?: NexusGenInputs['CategoryWhereInput'] | null; // CategoryWhereInput
    }
  }
  Query: {
    listPostsWithCategoryFoo: { // args
      first?: number | null; // Int
      last?: number | null; // Int
      orderBy?: NexusGenEnums['PostOrderByInput'][] | null; // [PostOrderByInput!]
      skip?: number | null; // Int
      where?: NexusGenInputs['PostWhereInput'] | null; // PostWhereInput
    }
    listUsers: { // args
      first?: number | null; // Int
      last?: number | null; // Int
      orderBy?: NexusGenEnums['UserOrderByInput'][] | null; // [UserOrderByInput!]
      skip?: number | null; // Int
      where?: NexusGenInputs['UserWhereInput'] | null; // UserWhereInput
    }
    listUsersWithNameJohn: { // args
      first?: number | null; // Int
      last?: number | null; // Int
      orderBy?: NexusGenEnums['UserOrderByInput'][] | null; // [UserOrderByInput!]
      skip?: number | null; // Int
      where?: NexusGenInputs['UserWhereInput'] | null; // UserWhereInput
    }
    posts: { // args
      first?: number | null; // Int
      last?: number | null; // Int
      orderBy?: NexusGenEnums['PostOrderByInput'][] | null; // [PostOrderByInput!]
      skip?: number | null; // Int
      where?: NexusGenInputs['PostWhereInput'] | null; // PostWhereInput
    }
  }
  User: {
    categories: { // args
      first?: number | null; // Int
      last?: number | null; // Int
      orderBy?: NexusGenEnums['CategoryOrderByInput'][] | null; // [CategoryOrderByInput!]
      skip?: number | null; // Int
      where?: NexusGenInputs['CategoryWhereInput'] | null; // CategoryWhereInput
    }
    posts: { // args
      first?: number | null; // Int
      last?: number | null; // Int
      orderBy?: NexusGenEnums['PostOrderByInput'][] | null; // [PostOrderByInput!]
      skip?: number | null; // Int
      where?: NexusGenInputs['PostWhereInput'] | null; // PostWhereInput
    }
  }
}

export interface NexusGenAbstractResolveReturnTypes {
}

export interface NexusGenInheritedFields {}

export type NexusGenObjectNames = "Category" | "Post" | "Query" | "User";

export type NexusGenInputNames = "CategoryWhereInput" | "PostWhereInput" | "UserWhereInput";

export type NexusGenEnumNames = "CategoryOrderByInput" | "PostOrderByInput" | "UserOrderByInput";

export type NexusGenInterfaceNames = never;

export type NexusGenScalarNames = "Boolean" | "DateTime" | "Float" | "ID" | "Int" | "String";

export type NexusGenUnionNames = never;

export interface NexusGenTypes {
  context: any;
  inputTypes: NexusGenInputs;
  rootTypes: NexusGenRootTypes;
  argTypes: NexusGenArgTypes;
  fieldTypes: NexusGenFieldTypes;
  allTypes: NexusGenAllTypes;
  inheritedFields: NexusGenInheritedFields;
  objectNames: NexusGenObjectNames;
  inputNames: NexusGenInputNames;
  enumNames: NexusGenEnumNames;
  interfaceNames: NexusGenInterfaceNames;
  scalarNames: NexusGenScalarNames;
  unionNames: NexusGenUnionNames;
  allInputTypes: NexusGenTypes['inputNames'] | NexusGenTypes['enumNames'] | NexusGenTypes['scalarNames'];
  allOutputTypes: NexusGenTypes['objectNames'] | NexusGenTypes['enumNames'] | NexusGenTypes['unionNames'] | NexusGenTypes['interfaceNames'] | NexusGenTypes['scalarNames'];
  allNamedTypes: NexusGenTypes['allInputTypes'] | NexusGenTypes['allOutputTypes']
  abstractTypes: NexusGenTypes['interfaceNames'] | NexusGenTypes['unionNames'];
  abstractResolveReturn: NexusGenAbstractResolveReturnTypes;
}


declare global {
  interface NexusGenPluginTypeConfig<TypeName extends string> {
  }
  interface NexusGenPluginFieldConfig<TypeName extends string, FieldName extends string> {
  }
  interface NexusGenPluginSchemaConfig {
  }
}