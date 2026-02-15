export class Logger {
  private source: string;
  
  constructor(source: string) {
    this.source = source;
  }
  
  private formatTime(): string {
    return new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }
  
  info(message: string): void {
    console.log(`${this.formatTime()} [${this.source}] ${message}`);
  }
  
  error(message: string, error?: unknown): void {
    console.error(`${this.formatTime()} [${this.source}] ERROR: ${message}`, error || '');
  }
  
  warn(message: string): void {
    console.warn(`${this.formatTime()} [${this.source}] WARN: ${message}`);
  }
  
  debug(message: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${this.formatTime()} [${this.source}] DEBUG: ${message}`);
    }
  }
}

export const createLogger = (source: string) => new Logger(source);
