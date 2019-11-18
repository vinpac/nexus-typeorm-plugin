import { getConnection } from 'typeorm'
import { inputObjectType } from 'nexus'
import { SchemaBuilder as NexusSchemaBuilder } from 'nexus/dist/core'
import { SchemaBuilder } from '../schema-builder'
import { columnToGraphQLTypeDef } from '../type'
import { getEntityTypeName } from '../util'

const singleOperandOperations = ['contains']
const numberOperandOperations = ['lt', 'lte', 'gt', 'gte']
const multipleOperandOperations = ['in']

export type ArgWhereType = {
  AND: ArgWhereType[]
  OR: ArgWhereType[]
  NOT: ArgWhereType[]
} & {
  [key: string]: string | Array<string | boolean | number>
}

export function createWhereInputObjectType(
  entity: any,
  nexusBuilder: NexusSchemaBuilder,
  schemaBuilder: SchemaBuilder,
) {
  const { columns: entityColumns } = getConnection().getMetadata(entity)
  const typeName = `${getEntityTypeName(entity)}WhereInput`
  nexusBuilder.addType(
    inputObjectType({
      name: typeName,
      definition: t => {
        t.field('AND', { type: typeName, list: true })
        t.field('OR', { type: typeName, list: true })
        t.field('NOT', { type: typeName, list: true })
        entityColumns.forEach(column => {
          if (column.relationMetadata && column.isVirtual) {
            return
          }

          let typeName: string | undefined

          if (column.type === 'enum') {
            typeName = schemaBuilder.useType(nexusBuilder, {
              type: 'enum',
              entity,
              column,
            })
          } else {
            typeName = columnToGraphQLTypeDef(column, entity)
          }

          if (typeName === 'String') {
            singleOperandOperations.forEach(singleOperandOperation => {
              t.field(`${column.propertyName}_${singleOperandOperation}`, {
                type: typeName!,
              })
            })
          } else if (typeName === 'Int' || typeName === 'Float') {
            numberOperandOperations.forEach(numberOperandOperation => {
              t.field(`${column.propertyName}_${numberOperandOperation}`, {
                type: typeName!,
              })
            })
          }

          // Define ${arg}_${operand}: Value[]
          multipleOperandOperations.forEach(multipleOperandOperation => {
            t.field(`${column.propertyName}_${multipleOperandOperation}`, {
              type: typeName!,
              list: true,
            })
          })

          t.field(column.propertyName, {
            type: typeName,
          })
        })
      },
    }),
  )

  return typeName
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

    idx += 1
    const value = where[key]
    const [fieldName, operation] = key.split('_')
    const paramName = `${fieldName}${idx}`
    translated.params[paramName] = value

    if (translated.expression) {
      translated.expression += ' AND '
    }
    const columnSelection = `${escape(alias)}.${escape(fieldName)}`

    if (operation === 'contains') {
      translated.params[paramName] = `%${translated.params[paramName]}%`
      translated.expression += `${columnSelection} LIKE :${paramName}`
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
