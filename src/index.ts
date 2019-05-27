import * as TypeORM from 'typeorm'

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
  queryFieldName?: string
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
  }
}

export function DatabaseObjectType(options?: {
  queryFieldName?: string
}): ClassDecorator {
  return (...args: Parameters<ClassDecorator>): void => {
    const [target] = args
    const metadata = getDatabaseObjectMetadata(target.prototype)
    metadata.queryFieldName = options && options.queryFieldName

    TypeORM.Entity()(target)
  }
}
