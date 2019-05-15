import * as GraphORM from '@/index'

import { User } from '../entities/user'

@GraphORM.Resolver({
  queryName: 'users',
  typeFunction: () => User,
})
export class UserResolver {
}
