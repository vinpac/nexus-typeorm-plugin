import { getConnection } from 'typeorm'
import { inputObjectType } from 'nexus'

export const singleOperandOperations = ['contains']
export const numberOperandOperations = ['lt', 'lte', 'gt', 'gte']
export const multipleOperandOperations = ['in']

export type ArgWhereType = {
  AND: ArgWhereType[]
  OR: ArgWhereType[]
  NOT: ArgWhereType[]
} & {
  [key: string]: string | Array<string | boolean | number>
}

function numberOperandOperationToOperator(operation: string): string | undefined {
  if (operation === 'lt') {
    return '<'
  } else if (operation === 'lte') {
    return '<='
  } else if (operation === 'gt') {
    return '>'
  } else if (operation === 'gte') {
    return '>='
  }
}

export interface TranslatedWhere {
  expression: string
  params: { [paramName: string]: any }
}

export function translateWhereClause(alias: string, where: any, idx = 0): TranslatedWhere {
  const {
    driver: { escape },
  } = getConnection()
  const translated: TranslatedWhere = {
    expression: '',
    params: {},
  }

  Object.keys(where).forEach(key => {
    if (key === 'AND' || key === 'OR' || key === 'NOT') {
      const subExpressions: string[] = []
      where[key].forEach((subWhere: any) => {
        const subTranslatedWhere = translateWhereClause(alias, subWhere, idx + 1)
        subExpressions.push(`(${subTranslatedWhere.expression})`)
        idx += Object.keys(subTranslatedWhere.params).length
        Object.assign(translated.params, subTranslatedWhere.params)
      })

      translated.expression += `${key === 'NOT' ? `${key} ` : ''}${subExpressions.join(
        ` ${key === 'NOT' ? 'OR' : key} `,
      )}`

      return
    }

    if (typeof where[key] !== 'object') {
      where[key] = { equals: where[key] }
    }

    for (const operation in where[key]) {
      idx += 1

      const value = where[key][operation]
      const fieldName = key

      const paramName = `${fieldName}${idx}`
      translated.params[paramName] = value

      if (translated.expression) {
        translated.expression += ' AND '
      }
      const columnSelection = `${escape(alias)}.${escape(fieldName)}`

      if (operation === 'contains') {
        translated.params[paramName] = `%${translated.params[paramName]}%`
        translated.expression += `${columnSelection} LIKE :${paramName}`
        continue
      }

      const operator = numberOperandOperationToOperator(operation)
      if (operator) {
        translated.expression += `${columnSelection} ${operator} :${paramName}`
        continue
      }

      if (operation === 'in') {
        translated.expression += `${columnSelection} IN (:...${paramName})`
        continue
      }

      translated.expression += `${columnSelection} = :${paramName}`
      continue
    }
  })

  return translated
}

export const StringFilter = inputObjectType({
  name: 'StringFilter',
  definition(t) {
    t.string('equals')
    singleOperandOperations.map(operator => t.string(operator))
    multipleOperandOperations.map(operator => t.list.string(operator))
  },
})

export const IntFilter = inputObjectType({
  name: 'IntFilter',
  definition(t) {
    t.int('equals')
    numberOperandOperations.map(operator => t.int(operator))
    multipleOperandOperations.map(operator => t.list.int(operator))
  },
})

export const IdFilter = inputObjectType({
  name: 'IdFilter',
  definition(t) {
    t.id('equals')
    multipleOperandOperations.map(operator => t.list.id(operator))
  },
})
