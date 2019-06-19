import { GraphQLFieldConfigArgumentMap } from 'graphql'

interface GetIdOptions {
  ctx: any
  args: any
}

interface BaseView {
  name: string
  args?: GraphQLFieldConfigArgumentMap
}

interface DirectView extends BaseView {
  isDirectView: true
}

interface SingleItemView extends BaseView {
  getId: (options: GetIdOptions) => Promise<any>
}

interface MultiItemView extends BaseView {
  getIds: (options: GetIdOptions) => Promise<any[]>
}

export type View = DirectView | SingleItemView | MultiItemView
