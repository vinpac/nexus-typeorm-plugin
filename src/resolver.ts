import * as TypeORM from 'typeorm'
import { GraphQLResolveInfo } from 'graphql'

import { getRelationsForQuery, graphQLObjectValueToObject } from './util'
import { TypeGraphORMField, getDatabaseObjectMetadata } from '.'
import { translateWhereClause, Where } from './where'
import { orderNamesToOrderInfos, OrderInfo } from './order'

function addSubqueries(
  qb: TypeORM.SelectQueryBuilder<any>,
  fields: TypeGraphORMField<any, any>[],
  alias: string,
) {
  fields.forEach(field => {
    if (field.addSelect) {
      qb.addSelect(
        sq => field.addSelect(sq, {}, alias),
        `${alias}_${field.propertyKey}`,
      )
    }
  })
}

export async function resolve({
  entity,
  where,
  info,
  take,
  skip,
  orders,
  ids,
}: {
  entity: any
  info: GraphQLResolveInfo
  where?: Where
  skip?: number
  take?: number
  orders?: OrderInfo[]
  ids?: any[]
}) {
  const meta = getDatabaseObjectMetadata(entity.prototype)
  const _conn = TypeORM.getConnection()
  const typeormMetadata = _conn.getMetadata(entity)
  const { name } = typeormMetadata
  const relations = getRelationsForQuery(entity, info)

  const qb = _conn.getRepository(entity).createQueryBuilder()

  relations.forEach(relation => {
    if (typeof relation.type === 'string') {
      // TODO: support string typed relation
      throw new Error(`String typed relation is not supported yet.`)
    } else {
      const relationMeta = getDatabaseObjectMetadata(relation.type.prototype)

      const entities = relation.relationPath.split('.')
      const lastPath = entities[entities.length - 1]
      const prevEntities = [typeormMetadata.name].concat(entities.slice(0, entities.length - 1))

      const joinPath = `${prevEntities.join('_')}.${lastPath}`
      const alias = `${prevEntities.join('_')}_${lastPath}`

      addSubqueries(qb, relationMeta.fields, alias)

      const { arguments: fieldArgs } = relation.fieldNode

      if (fieldArgs) {
        const [clause, params] = (() => {
          const whereArg = fieldArgs.find(arg => arg.name.value === 'where')

          if (whereArg) {
            const whereArgObject = graphQLObjectValueToObject(whereArg.value)
            return translateWhereClause(
              alias,
              whereArgObject,
              relation.relationPath,
            )
          }
          return []
        })()
        qb.leftJoinAndSelect(joinPath, alias, clause, params)

        const orderByArg = fieldArgs.find(arg => arg.name.value === 'orderBy')

        if (orderByArg) {
          const orderByArgObject = graphQLObjectValueToObject(orderByArg.value)
          const orderByNames = orderByArgObject instanceof Array ? orderByArgObject : [orderByArgObject]
          const orders = orderNamesToOrderInfos(orderByNames)
          orders.forEach(order => {
            if (order) {
              qb.addOrderBy(`${alias}.${order.propertyName}`, order.type)
            }
          })
        }
      }
    }
  })

  addSubqueries(qb, meta.fields, typeormMetadata.name)

  if (ids) {
    qb.whereInIds(ids)
  } else if (where) {
    const [ clause, params ] = where
    qb.where(clause, params)
  }

  if (orders) {
    orders.forEach(order => {
      if (order) {
        qb.addOrderBy(`${name}.${order.propertyName}`, order.type)
      }
    })
  }

  if (take) {
    qb.take(take)
  }

  if (skip) {
    qb.skip(skip)
  }

  if (process.env.__TGO_SHOW_SQL) {
    console.log(qb.getQueryAndParameters())  // eslint-disable-line no-console
  }

  return qb.getMany()
}
