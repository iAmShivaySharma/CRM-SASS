import path from 'path'
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
    security: 5,
    performance: 6,
    database: 7,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
    security: 'cyan',
    performance: 'blue',
    database: 'gray',
  },
}

winston.addColors(customLevels.colors)

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? JSON.stringify(meta, null, 2)
      : ''
    return `${timestamp} [${level}]: ${message} ${metaStr}`
  })
)

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

const transports: winston.transport[] = []

if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.Console({
      format: jsonFormat,
      level: process.env.LOG_LEVEL || 'info',
    })
  )
} else {
  const logsDir = path.join(process.cwd(), 'logs')

  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug',
    }),
    new DailyRotateFile({
      filename: path.join(logsDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: jsonFormat,
    }),
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: jsonFormat,
    })
  )
}

const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || 'info',
  format: jsonFormat,
  defaultMeta: {
    service: 'crm-api',
    environment: process.env.NODE_ENV || 'development',
  },
  transports,
})

export class Logger {
  private static instance: Logger
  private winston: winston.Logger

  private constructor() {
    this.winston = logger
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  error(message: string, meta?: any): void {
    this.winston.error(message, meta)
  }

  warn(message: string, meta?: any): void {
    this.winston.warn(message, meta)
  }

  info(message: string, meta?: any): void {
    this.winston.info(message, meta)
  }

  debug(message: string, meta?: any): void {
    this.winston.debug(message, meta)
  }

  security(
    event: string,
    details: any,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    this.winston.log('security', `SECURITY_EVENT: ${event}`, {
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...details,
    })
  }

  performance(operation: string, duration: number, details?: any): void {
    this.winston.log(
      'performance',
      `PERFORMANCE: ${operation} took ${duration}ms`,
      {
        operation,
        duration,
        timestamp: new Date().toISOString(),
        ...details,
      }
    )
  }

  database(query: string, duration: number, details?: any): void {
    this.winston.log('database', `DB_QUERY: ${query} (${duration}ms)`, {
      query,
      duration,
      timestamp: new Date().toISOString(),
      ...details,
    })
  }

  http(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    details?: any
  ): void {
    this.winston.http(`${method} ${url} ${statusCode} - ${duration}ms`, {
      method,
      url,
      statusCode,
      duration,
      timestamp: new Date().toISOString(),
      ...details,
    })
  }

  audit(action: string, userId: string, resource: string, details?: any): void {
    this.winston.info(`AUDIT: ${action} on ${resource} by ${userId}`, {
      type: 'audit',
      action,
      userId,
      resource,
      timestamp: new Date().toISOString(),
      ...details,
    })
  }

  business(event: string, details: any): void {
    this.winston.info(`BUSINESS_EVENT: ${event}`, {
      type: 'business',
      event,
      timestamp: new Date().toISOString(),
      ...details,
    })
  }
}

export const log = Logger.getInstance()

export { logger as winstonLogger }

export function measureTime<T>(
  operation: string,
  fn: () => Promise<T> | T,
  logDetails?: any
): Promise<T> {
  const start = Date.now()

  const logResult = (result: T) => {
    const duration = Date.now() - start
    log.performance(operation, duration, logDetails)
    return result
  }

  try {
    const result = fn()
    if (result instanceof Promise) {
      return result.then(logResult).catch(error => {
        const duration = Date.now() - start
        log.error(`${operation} failed after ${duration}ms`, {
          error: error.message,
          ...logDetails,
        })
        throw error
      })
    } else {
      return Promise.resolve(logResult(result))
    }
  } catch (error) {
    const duration = Date.now() - start
    log.error(`${operation} failed after ${duration}ms`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      ...logDetails,
    })
    throw error
  }
}

export default log
