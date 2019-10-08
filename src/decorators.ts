import * as TypeORM from 'typeorm'
import { EntityOptions } from 'typeorm'

export const nexusEntityMetadata = Symbol('nexusEntityMetadata')

export interface NexusEntityMetadata extends Omit<NexusEntityOptions, 'name'> {
  typeName: string
}

export function getDatabaseObjectMetadata(target: any): NexusEntityMetadata {
  return Reflect.getMetadata(nexusEntityMetadata, target) || { typeName: target.name }
}

export interface NexusEntityOptions extends Omit<EntityOptions, 'name'> {
  typeName?: string
  tableName?: string
}

const decoratedEntities: Function[] = []
export function getDecoratedEntities(): Function[] {
  return decoratedEntities
}

export function NexusEntity(prevOptions?: NexusEntityOptions): ClassDecorator {
  return (...args: Parameters<ClassDecorator>): void => {
    const [target] = args
    decoratedEntities.push(target)
    const options: NexusEntityMetadata = {
      ...prevOptions,
      typeName: (prevOptions && prevOptions.typeName) || target.name,
    }

    Reflect.defineMetadata(nexusEntityMetadata, options, target)
    TypeORM.Entity(options && options.tableName, options)(target)
  }
}
