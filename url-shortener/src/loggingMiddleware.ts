// loggingMiddleware.ts
// Custom logging middleware for the URL Shortener app

interface LogEntry {
  timestamp: string;
  message: string;
  context?: Record<string, any>;
}

const logs: LogEntry[] = [];

export function log(message: string, context?: Record<string, any>) {
  logs.push({
    timestamp: new Date().toISOString(),
    message,
    context,
  });
}

export function getLogs(): LogEntry[] {
  return [...logs];
} 