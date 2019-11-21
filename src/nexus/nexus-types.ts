import { objectType } from 'nexus'
import { getDatabaseObjectMetadata } from '../decorators'

export function entityType(entity: any) {
  const metadata = getDatabaseObjectMetadata(entity)
  return objectType<any>({
    name: metadata.typeName,
    definition: t => (t as any).entityFields(),
  })
}
