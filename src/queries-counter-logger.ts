import { Logger } from 'typeorm'

export interface QueryLog {
  query: string
  parameters?: any[]
}

export interface QueryErrorLog {
  error: string
  query: string
  parameters?: any[]
}

export interface SlowQueryLog {
  time: number
  query: string
  parameters?: any[]
}

export interface SchemaBuildLog {
  message: string
}

export interface MigrationLog {
  message: string
}

export interface Log {
  level: 'log' | 'info' | 'warn'
  message: any
}

export interface QueriesCounterLoggerState {
  queries: QueryLog[]
  errors: QueryErrorLog[]
  slowQueries: SlowQueryLog[]
  schemaBuilds: SchemaBuildLog[]
  migrations: MigrationLog[]
  logs: Log[]
}

export class QueriesCounterLogger implements Logger {
  private state: QueriesCounterLoggerState = {
    queries: [],
    errors: [],
    slowQueries: [],
    schemaBuilds: [],
    migrations: [],
    logs: [],
  }

  reset() {
    this.state = {
      queries: [],
      errors: [],
      slowQueries: [],
      schemaBuilds: [],
      migrations: [],
      logs: [],
    }
  }

  get queries() {
    return this.state.queries
  }

  get errors() {
    return this.state.errors
  }

  get slowQueries() {
    return this.state.slowQueries
  }

  get schemaBuilds() {
    return this.state.schemaBuilds
  }

  get migrations() {
    return this.state.migrations
  }

  get logs() {
    return this.state.logs
  }

  logQuery(query: string, parameters?: any[]) {
    this.state.queries.push({
      query,
      parameters,
    })
  }

  logQueryError(error: string, query: string, parameters?: any[] | undefined) {
    this.state.errors.push({
      error,
      query,
      parameters,
    })
  }

  logQuerySlow(time: number, query: string, parameters?: any[] | undefined) {
    this.state.slowQueries.push({
      time,
      query,
      parameters,
    })
  }

  logSchemaBuild(message: string) {
    this.state.schemaBuilds.push({ message })
  }

  logMigration(message: string) {
    this.state.migrations.push({ message })
  }

  log(level: 'log' | 'info' | 'warn', message: any) {
    this.state.logs.push({ level, message })
  }
}
