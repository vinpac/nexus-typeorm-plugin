import camelCase from 'camelcase'
import pluralize = require('pluralize')
import { makeFirstLetterUpperCase } from '../util'

export const namingStrategy = {
  findOneField: (entityName: string) => camelCase(entityName),
  findManyField: (entityName: string) => camelCase(pluralize(entityName)),
  createInputType: (entityName: string) => `${makeFirstLetterUpperCase(entityName)}CreateInput`,
  whereInputType: (entityName: string) => `${entityName}WhereInput`,
  orderByInputType: (entityName: string) => `${entityName}OrderByInput`,
  enumType: (entityName: string, propertyName: string) =>
    `${entityName}${makeFirstLetterUpperCase(propertyName)}Enum`,
  createOneFieldName: (entityName: string) => camelCase(`createOne${entityName}`),
  createManyWithoutSourceInputType: (sourceEntityName: string, relatedEntityName: string) =>
    `CreateMany${pluralize(relatedEntityName)}Without${sourceEntityName}Input`,
  createWithoutSourceInputType: (entityName: string, propertyName: string) =>
    `Create${pluralize(entityName)}Without${makeFirstLetterUpperCase(propertyName)}Input`,
} as const
