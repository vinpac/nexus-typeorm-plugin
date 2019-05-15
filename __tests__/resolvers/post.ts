import * as GraphORM from '@/index'

import { Post } from '../entities/post'

@GraphORM.Resolver({
  queryName: 'posts',
  typeFunction: () => Post,
})
export class PostResolver {
}
