import { SchemaBuilder } from '../schema-builder'
import { getConnection } from 'typeorm'
import { columnToGraphQLTypeDef, createEntityEnumColumnTypeDefs } from '../type'
import { getEntityName } from '../util'

const singleOperandOperations = ['contains']
const numberOperandOperations = ['lt', 'lte', 'gt', 'gte']
const multipleOperandOperations = ['in']

export type ArgWhere = {
  AND: ArgWhere[]
  OR: ArgWhere[]
  NOT: ArgWhere
} & {
  [key: string]: string | Array<string | boolean | number>
}

export function createWhereInputTypeDef(
  entity: Function,
  schemaBuilder: SchemaBuilder,
): SchemaBuilder {
  const entityName = getEntityName(entity)
  const entityMetadata = getConnection().getMetadata(entity)

  // If whereInputTypeName is already defined for this Model
  // we don't need to re-create it
  if (schemaBuilder.meta[entityName].whereInputTypeName) {
    return schemaBuilder
  }

  let nextSchemaBuilder = { ...schemaBuilder }
  let whereInputTypeColumnsDef = ''
  entityMetadata.columns.forEach(column => {
    if (column.relationMetadata && column.isVirtual) {
      return
    }

    let typeName: string | undefined

    if (column.type === 'enum') {
      nextSchemaBuilder = createEntityEnumColumnTypeDefs(entity, column, nextSchemaBuilder)
      typeName = nextSchemaBuilder.meta[entityName].entityEnumColumnType[column.propertyName]
    } else {
      typeName = columnToGraphQLTypeDef(column, entity)
    }

    whereInputTypeColumnsDef += `${column.propertyName}: ${typeName}\n`

    if (typeName === 'String') {
      singleOperandOperations.forEach(singleOperandOperation => {
        whereInputTypeColumnsDef += `${column.propertyName}_${singleOperandOperation}: ${typeName}\n`
      })
    } else if (typeName === 'Int' || typeName === 'Float') {
      numberOperandOperations.forEach(numberOperandOperation => {
        whereInputTypeColumnsDef += `${column.propertyName}_${numberOperandOperation}: ${typeName}\n`
      })
    }

    // Define ${arg}_${operand}: Value[]
    multipleOperandOperations.forEach(multipleOperandOperation => {
      whereInputTypeColumnsDef += `${column.propertyName}_${multipleOperandOperation}: [${typeName}!]\n`
    })

    whereInputTypeColumnsDef += '\n'
  })

  const whereInputTypeName = `${entityName}WhereInput`

  return {
    ...schemaBuilder,
    typeDefs: `${schemaBuilder.typeDefs}
input ${whereInputTypeName} {
  AND: [${whereInputTypeName}!]
  OR: [${whereInputTypeName}!]
  NOT: [${whereInputTypeName}!]
  ${whereInputTypeColumnsDef}
}
    `,
    meta: {
      ...schemaBuilder.meta,
      [entityName]: {
        ...schemaBuilder.meta[entityName],
        whereInputTypeName,
      },
    },
  }
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

export function translateWhereClause(entityName: string, where: any, idx = 0): TranslatedWhere {
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
        const subTranslatedWhere = translateWhereClause(entityName, subWhere, idx + 1)
        subExpressions.push(`(${subTranslatedWhere.expression})`)
        idx += Object.keys(subTranslatedWhere.params).length
        Object.assign(translated.params, subTranslatedWhere.params)
      })

      translated.expression += `${key === 'NOT' ? `${key} ` : ''}${subExpressions.join(
        ` ${key === 'NOT' ? 'OR' : key} `,
      )}`

      return
    }

    idx += 1
    const value = where[key]
    const [fieldName, operation] = key.split('_')
    const paramName = `${fieldName}${idx}`
    translated.params[paramName] = value

    if (translated.expression) {
      translated.expression += ' AND '
    }
    const columnSelection = `${escape(entityName)}.${escape(fieldName)}`

    if (operation === 'contains') {
      translated.expression += `${columnSelection} LIKE '%:${paramName}%'`
      return
    }

    const operator = numberOperandOperationToOperator(operation)
    if (operator) {
      translated.expression += `${columnSelection} ${operator} :${paramName}`
      return
    }

    if (operation === 'in') {
      translated.expression += `${columnSelection} IN (:...${paramName})`
      return
    }

    translated.expression += `${columnSelection} = :${paramName}`
  })

  return translated
}
