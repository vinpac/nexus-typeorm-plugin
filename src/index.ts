import * as TypeORM from 'typeorm'
import { GraphQLFieldResolver, GraphQLOutputType } from 'graphql'

import { View } from './view'

const databaseObjectMetadataKey = Symbol('databaseObjectMetadataKey')

type FieldQueryBuilder<T, C> = (
  qb: TypeORM.SelectQueryBuilder<T>,
  ctx: C,
  alias: string,
) => TypeORM.SelectQueryBuilder<T>

export interface TypeGraphORMField<T, C> {
  propertyKey: string
  nullable?: boolean
  resolve?: GraphQLFieldResolver<T, C>
  type?: GraphQLOutputType
  addSelect?: FieldQueryBuilder<T, C>
}

interface DatabaseObjectMetadata<T, C> {
  fields: TypeGraphORMField<T, C>[]
  views?: View[]
}

function makeDefaultDatabaseObjectMetadata<T, C>(): DatabaseObjectMetadata<T, C> {
  return {
    fields: [],
  }
}

export function getDatabaseObjectMetadata<T, C>(target: object): DatabaseObjectMetadata<T, C> {
  const metadata = Reflect.getMetadata(databaseObjectMetadataKey, target)

  if (metadata) {
    return metadata
  } else {
    const defaultMetadata = makeDefaultDatabaseObjectMetadata<T, C>()
    Reflect.defineMetadata(databaseObjectMetadataKey, defaultMetadata, target)
    return defaultMetadata
  }
}

export function Field<T, C>(options: {
  addSelect?: FieldQueryBuilder<T, C>
  resolve?: GraphQLFieldResolver<T, C>
  type?: GraphQLOutputType
  nullable?: boolean
}): PropertyDecorator {
  return (...args: Parameters<PropertyDecorator>): void => {
    const [target, propertyKey] = args
    const metadata = getDatabaseObjectMetadata<T, C>(target)

    if (typeof propertyKey === 'string') {
      metadata.fields.push({
        ...options,
        propertyKey,
      })
    }
  }
}

export function DatabaseObjectType(options?: {
  views?: View[]
}): ClassDecorator {
  return (...args: Parameters<ClassDecorator>): void => {
    const [target] = args
    const metadata = getDatabaseObjectMetadata(target.prototype)
    metadata.views = options && options.views

    TypeORM.Entity()(target)
  }
}
