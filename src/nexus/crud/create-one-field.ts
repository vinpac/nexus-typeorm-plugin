import { namingStrategy } from '../naming-strategy'
import { getEntityTypeName } from '../../util'
import { EntityTypeDefManager } from '../../entity-type-def-manager'
import * as Nexus from 'nexus'
import { OutputPropertyFactoryConfig } from 'nexus/dist/dynamicProperty'
import { MapArgsFn } from '../../args'
import { ArgsRecord } from 'nexus/dist/core'
import { CRUDFieldConfigResolveFn } from '../crud-field-output-method'
import { getConnection } from 'typeorm'
import { translateWhereClause, ArgWhereType } from '../../args/arg-where'

export interface CreateOneFieldPublisherConfig<TEntity> {
  type?: Nexus.core.AllOutputTypes
  args?: ArgsRecord | MapArgsFn
  resolve?: CRUDFieldConfigResolveFn<TEntity>
  nullable?: boolean
}

interface AnyEntityInput {
  [propertyName: string]: any
}

interface RelationInput {
  connect?: ArgWhereType
  create?: Array<AnyEntityInput> | AnyEntityInput
}

async function createEntityFromInputObject(
  entity: any,
  manager: EntityTypeDefManager,
  inputObject: AnyEntityInput,
  save: <TEntity>(instance: TEntity) => Promise<TEntity>,
  initialValues?: AnyEntityInput,
): Promise<any> {
  const entityInstance = new entity()
  const entityMetadata = manager.getEntityMetadata(entity)
  const waitBeforeSaving: Promise<(<U>(savedEntityInstance: U) => U) | void>[] = []
  const executeAfterSaved: Function[] = []

  if (initialValues) {
    Object.assign(entityInstance, initialValues)
  }

  entityMetadata.columns.forEach(column => {
    entityInstance[column.propertyName] = inputObject[column.propertyName]
  })

  entityMetadata.relations.forEach(relation => {
    const relationInput: RelationInput = inputObject[relation.propertyName]

    if (relationInput) {
      const relatedEntity = manager.entities[relation.inverseEntityMetadata.name]
      if (relationInput.connect) {
        const where = translateWhereClause('node', relationInput.connect)
        waitBeforeSaving.push(
          getConnection()
            .getRepository(relatedEntity)
            .createQueryBuilder('node')
            .where(where.expression, where.params)
            [relation.isOneToMany || relation.isManyToMany ? 'getMany' : 'getOne']()
            .then(result => {
              entityInstance[relation.propertyName] = result
            }),
        )
      }

      if (relationInput.create) {
        if (Array.isArray(relationInput.create)) {
          if (!entityInstance[relation.propertyName]) {
            entityInstance[relation.propertyName] = []
          }

          if (relation.isOneToMany) {
            executeAfterSaved.push(
              ...relationInput.create.map(item => (savedEntityInstance: any) =>
                createEntityFromInputObject(
                  relatedEntity,
                  manager,
                  item,
                  save,

                  { [relation.inverseRelation!.propertyName]: savedEntityInstance },
                ).then(relatedEntityInstance => {
                  savedEntityInstance[relation.propertyName].push(relatedEntityInstance)
                  return savedEntityInstance
                }),
              ),
            )
          } else {
            waitBeforeSaving.push(
              ...relationInput.create.map(item =>
                createEntityFromInputObject(relatedEntity, manager, item, save).then(
                  relatedEntityInstance => {
                    entityInstance[relation.propertyName].push(relatedEntityInstance)
                  },
                ),
              ),
            )
          }
        } else {
          executeAfterSaved.push((savedEntityInstance: any) => {
            return createEntityFromInputObject(
              relatedEntity,
              manager,
              relationInput.create as AnyEntityInput,
              save,
              { [relation.inverseRelation!.propertyName]: savedEntityInstance },
            ).then(relatedEntityInstance => {
              savedEntityInstance[relation.propertyName] = relatedEntityInstance
              return relatedEntityInstance
            })
          })
        }
      }
    } else if (relation.isManyToMany || relation.isOneToMany) {
      entityInstance[relation.propertyName] = []
    }
  })

  const waitedPromisePayload = await Promise.all(waitBeforeSaving)
  const savedInstance = await save(entityInstance).then(payload =>
    waitedPromisePayload.reduce((payload, fn) => (fn ? fn(payload) : payload), payload),
  )
  await Promise.all(executeAfterSaved.map(fn => fn(savedInstance)))
  return savedInstance
}

export function defineCreateOneField(
  entity: any,
  factoryConfig: OutputPropertyFactoryConfig<any>,
  manager: EntityTypeDefManager,
  givenFieldName?: string,
  config: CreateOneFieldPublisherConfig<any> = {},
) {
  const { typeDef: t, builder } = factoryConfig
  const typeName = config.type || getEntityTypeName(entity)

  t.field(givenFieldName || namingStrategy.createInputType(typeName), {
    type: typeName,
    nullable: config.nullable,
    args: {
      data: Nexus.arg({
        type: manager.useCreateOneInputType(entity, builder),
        nullable: false,
      }),
    },
    resolve: async (_, args) => {
      const conn = getConnection()
      return await conn.transaction(async transaction => {
        return await createEntityFromInputObject(
          entity,
          manager,
          args.data,
          transaction.save.bind(transaction),
        )
      })
    },
  })
}
