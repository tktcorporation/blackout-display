/**
 * logger.ts
 * 
 * Purpose: Provides logging utilities that integrate with dev3000 for enhanced debugging
 * 
 * This module allows the application to send logs to dev3000's MCP server when running
 * in development mode, enabling AI-assisted debugging with full context of application behavior.
 * 
 * Dependencies:
 * - dev3000 MCP server running on localhost:3684
 * - Only active in development mode (import.meta.env.DEV)
 */

/**
 * Sends a log entry to dev3000's MCP server
 * 
 * Purpose: Allows AI debuggers to see application logs alongside system logs,
 * providing complete context for debugging complex issues
 * 
 * @param level - Log level (LOG, WARN, ERROR, INFO)
 * @param message - The log message to send
 * @param metadata - Optional metadata to include with the log
 * @returns Promise that resolves when the log is sent (or fails silently)
 * 
 * Side Effects:
 * - Sends HTTP POST request to dev3000 MCP server if running
 * - Fails silently if dev3000 is not available
 */
const sendToDev3000 = async (
  level: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  if (!import.meta.env.DEV) {
    return;
  }

  try {
    const timestamp = new Date().toISOString();
    const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    const entry = `[${timestamp}] [TAURI-FRONTEND] [${level}] ${message}${metaStr}`;

    await fetch('http://localhost:3684/api/logs/append', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry,
        source: 'tauri-frontend'
      })
    });
  } catch (e) {
    // Silently ignore - dev3000 might not be running
  }
};

/**
 * Enhanced console logger that sends logs to both console and dev3000
 * 
 * Purpose: Provides a drop-in replacement for console methods that automatically
 * integrates with dev3000 for AI-assisted debugging
 */
export const logger = {
  /**
   * Log general information
   */
  log: (message: string, ...args: unknown[]) => {
    console.log(message, ...args);
    sendToDev3000('LOG', message, args.length > 0 ? { args } : undefined);
  },

  /**
   * Log informational messages
   */
  info: (message: string, ...args: unknown[]) => {
    console.info(message, ...args);
    sendToDev3000('INFO', message, args.length > 0 ? { args } : undefined);
  },

  /**
   * Log warnings
   */
  warn: (message: string, ...args: unknown[]) => {
    console.warn(message, ...args);
    sendToDev3000('WARN', message, args.length > 0 ? { args } : undefined);
  },

  /**
   * Log errors with optional error object
   */
  error: (message: string, error?: Error | unknown, ...args: unknown[]) => {
    console.error(message, error, ...args);
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;
    sendToDev3000('ERROR', message, { error: errorData, args });
  },

  /**
   * Log debug information (only in development)
   */
  debug: (message: string, ...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.debug(message, ...args);
      sendToDev3000('DEBUG', message, args.length > 0 ? { args } : undefined);
    }
  }
};

/**
 * Installs global error handlers that send uncaught errors to dev3000
 * 
 * Purpose: Ensures all errors are captured for debugging, even those not explicitly logged
 * 
 * Side Effects:
 * - Overrides window.onerror and window.onunhandledrejection
 * - Should be called once during application initialization
 */
export const installGlobalErrorHandlers = () => {
  if (!import.meta.env.DEV) {
    return;
  }

  window.onerror = (message, source, lineno, colno, error) => {
    logger.error('Uncaught error', {
      message,
      source,
      lineno,
      colno,
      error: error?.stack || error
    });
    return false;
  };

  window.onunhandledrejection = (event) => {
    logger.error('Unhandled promise rejection', {
      reason: event.reason,
      promise: event.promise
    });
  };
};