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
  createOneRelationInputType: (sourceEntityName: string, propertyName: string) =>
    `Create${sourceEntityName}To${makeFirstLetterUpperCase(camelCase(propertyName))}RelationInput`,
  createManyRelationInputType: (sourceEntityName: string, propertyName: string) =>
    `Create${pluralize(sourceEntityName)}${makeFirstLetterUpperCase(
      camelCase(propertyName),
    )}RelationInput`,
  entityWithoutRelationInputType: (entityName: string, propertyName: string) =>
    `${entityName}CreateWithout${makeFirstLetterUpperCase(camelCase(propertyName))}Input`,
} as const
