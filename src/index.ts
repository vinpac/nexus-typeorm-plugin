import * as TypeGraphQL from 'type-graphql'
import * as TypeORM from 'typeorm'
import { GraphQLResolveInfo } from 'graphql'
import { getRelationsForQuery } from './util'

const databaseObjectMetadataKey = Symbol('databaseObjectMetadataKey')

type FieldQueryBuilder<T, C> = (
  qb: TypeORM.SelectQueryBuilder<T>,
  ctx: C,
) => TypeORM.SelectQueryBuilder<T>
type ResultToProperty = (data: any) => any

interface Field<T, C> {
  propertyKey: string | symbol
  addSelect: FieldQueryBuilder<T, C>
  resultToProperty: ResultToProperty
  typeFunc: () => (new () => {})
}

interface DatabaseObjectMetadata<T, C> {
  fields: Field<T, C>[]
  alias?: string
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
  typeFunc: () => any
  addSelect: FieldQueryBuilder<T, C>
  resultToProperty(data: any): any
}): PropertyDecorator {
  return (...args: Parameters<PropertyDecorator>): void => {
    const [target, propertyKey] = args
    const metadata = getDatabaseObjectMetadata<T, C>(target)
    metadata.fields.push({
      ...options,
      propertyKey,
    })

    TypeGraphQL.Field(options.typeFunc)(target, propertyKey)
  }
}

export function DatabaseObjectType(options?: {
  alias?: string
}): ClassDecorator {
  return (...args: Parameters<ClassDecorator>): void => {
    const [target] = args
    const metadata = getDatabaseObjectMetadata(target.prototype)
    metadata.alias = options && options.alias

    TypeGraphQL.ObjectType()(target)
    TypeORM.Entity()(target)
  }
}

export function Resolver<T, C>({
  typeFunction,
  queryName,
}: {
  typeFunction: () => (new () => T)
  queryName: string
}): ClassDecorator {
  const targetType = typeFunction()

  return (...args: Parameters<ClassDecorator>): void => {
    const [target] = args

    const targetTypeMetadata = getDatabaseObjectMetadata(targetType.prototype)

    targetTypeMetadata.fields.forEach(({
      propertyKey,
      addSelect,
      resultToProperty,
      typeFunc,
    }) => {
      async function resolver(root: T, ctx: C) {
        const { alias } = targetTypeMetadata

        if ('id' in root) {
          const id = (root as any).id
          const conn = await TypeORM.getConnection()
          const qb = conn.getRepository(targetType).createQueryBuilder(alias)
          addSelect(qb, ctx)
          qb.where(`${alias}.id = ${id}`)
          const raw = await qb.getRawOne()
          return resultToProperty(raw)
        }

        throw new Error('Cannot find root ID.')
      }

      target.prototype[propertyKey] = resolver
      TypeGraphQL.Root()(target.prototype, propertyKey, 0)
      TypeGraphQL.Ctx()(target.prototype, propertyKey, 1)
      TypeGraphQL.FieldResolver(typeFunc)(target.prototype, propertyKey, { value: resolver })
    })

    /*
    Parameters are commented just because they're not used currently.
    Parameters will be used to compute context of the query and conditionally add subqueries.
    */
    async function rootQueryResolver(
      info: GraphQLResolveInfo,
      // ctx: ResolverContext,
    ) {
      const conn = await TypeORM.getConnection()
      const relations = getRelationsForQuery(targetType, info)

      return conn.getRepository(targetType).find({
        relations,
      })
    }

    target.prototype[queryName] = rootQueryResolver
    TypeGraphQL.Info()(target.prototype, queryName, 0)
    TypeGraphQL.Ctx()(target.prototype, queryName, 1)
    TypeGraphQL.Query(() => [targetType])
    (target.prototype, queryName, { value: rootQueryResolver })

    TypeGraphQL.Resolver(typeFunction)(target)
  }
}
