/**
 * Structured logging utility for the application
 * Provides consistent log formatting, levels, and context tracking
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private context: LogContext = {};

  /**
   * Set context for subsequent logs
   */
  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Format log entry as JSON
   */
  private formatLog(level: LogLevel, message: string, error?: Error, additionalContext?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...additionalContext },
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    };
  }

  /**
   * Output log to console
   */
  private output(entry: LogEntry): void {
    const logString = JSON.stringify(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logString);
        break;
      case LogLevel.INFO:
        console.log(logString);
        break;
      case LogLevel.WARN:
        console.warn(logString);
        break;
      case LogLevel.ERROR:
        console.error(logString);
        break;
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    const entry = this.formatLog(LogLevel.DEBUG, message, undefined, context);
    this.output(entry);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    const entry = this.formatLog(LogLevel.INFO, message, undefined, context);
    this.output(entry);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    const entry = this.formatLog(LogLevel.WARN, message, undefined, context);
    this.output(entry);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const entry = this.formatLog(LogLevel.ERROR, message, error, context);
    this.output(entry);
  }

  /**
   * Log HTTP request
   */
  logRequest(method: string, endpoint: string, context?: LogContext): void {
    this.info(`${method} ${endpoint}`, {
      ...context,
      method,
      endpoint,
    });
  }

  /**
   * Log HTTP response
   */
  logResponse(method: string, endpoint: string, statusCode: number, duration: number, context?: LogContext): void {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const message = `${method} ${endpoint} ${statusCode} ${duration}ms`;
    
    if (level === LogLevel.WARN) {
      this.warn(message, {
        ...context,
        method,
        endpoint,
        statusCode,
        duration,
      });
    } else {
      this.info(message, {
        ...context,
        method,
        endpoint,
        statusCode,
        duration,
      });
    }
  }

  /**
   * Log database operation
   */
  logDatabase(operation: string, table: string, duration: number, context?: LogContext): void {
    this.debug(`DB ${operation} ${table} ${duration}ms`, {
      ...context,
      operation,
      table,
      duration,
    });
  }

  /**
   * Log authentication event
   */
  logAuth(event: string, userId?: string, context?: LogContext): void {
    this.info(`Auth: ${event}`, {
      ...context,
      userId,
      event,
    });
  }

  /**
   * Log security event
   */
  logSecurity(event: string, severity: 'low' | 'medium' | 'high', context?: LogContext): void {
    const level = severity === 'high' ? LogLevel.ERROR : severity === 'medium' ? LogLevel.WARN : LogLevel.INFO;
    const message = `Security: ${event} (${severity})`;
    
    if (level === LogLevel.ERROR) {
      this.error(message, undefined, { ...context, event, severity });
    } else if (level === LogLevel.WARN) {
      this.warn(message, { ...context, event, severity });
    } else {
      this.info(message, { ...context, event, severity });
    }
  }
}

// Export singleton instance
export const logger = new Logger();
