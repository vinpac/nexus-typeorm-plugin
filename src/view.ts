import { GraphQLFieldConfigArgumentMap } from 'graphql'

interface BaseView {
  name: string
  args?: GraphQLFieldConfigArgumentMap
}

interface DirectView extends BaseView {
  isDirectView: true
}

interface IdView extends BaseView {
  getIds: (options: {
    ctx: any
    args: any
  }) => Promise<any[]>
}

export type View = DirectView | IdView
