/**
 * Structured logger for ACCESS-CI MCP servers.
 *
 * This logger writes to stderr to avoid interfering with MCP's JSON-RPC
 * communication on stdout. It supports log levels that can be controlled
 * via the LOG_LEVEL environment variable.
 *
 * Log levels (in order of severity):
 * - error: Always shown, for critical errors
 * - warn: Warnings that don't prevent operation
 * - info: Important informational messages
 * - debug: Detailed debugging information (disabled by default)
 *
 * Usage:
 *   import { createLogger } from "@access-mcp/shared";
 *   const logger = createLogger("my-server");
 *   logger.info("Server started");
 *   logger.error("Failed to connect", { url: "http://..." });
 */

export type LogLevel = "error" | "warn" | "info" | "debug";

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  error: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  debug: (message: string, context?: LogContext) => void;
}

function getLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  if (level && level in LOG_LEVELS) {
    return level as LogLevel;
  }
  // Default to 'warn' for production (errors and warnings only)
  return "warn";
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = getLogLevel();
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

function formatMessage(
  serverName: string,
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  return `[${timestamp}] [${serverName}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Create a logger instance for a specific server.
 *
 * @param serverName - The name of the server (e.g., "access-mcp-events")
 * @returns A logger instance with error, warn, info, and debug methods
 */
export function createLogger(serverName: string): Logger {
  return {
    error: (message: string, context?: LogContext) => {
      if (shouldLog("error")) {
        console.error(formatMessage(serverName, "error", message, context));
      }
    },
    warn: (message: string, context?: LogContext) => {
      if (shouldLog("warn")) {
        console.error(formatMessage(serverName, "warn", message, context));
      }
    },
    info: (message: string, context?: LogContext) => {
      if (shouldLog("info")) {
        console.error(formatMessage(serverName, "info", message, context));
      }
    },
    debug: (message: string, context?: LogContext) => {
      if (shouldLog("debug")) {
        console.error(formatMessage(serverName, "debug", message, context));
      }
    },
  };
}

/**
 * A no-op logger that silently discards all log messages.
 * Useful for testing or when logging should be completely disabled.
 */
export const silentLogger: Logger = {
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {},
};
