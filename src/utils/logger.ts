import * as vscode from 'vscode';

class Logger {
  private channel: vscode.OutputChannel | undefined;

  public initialize(context: vscode.ExtensionContext): void {
    this.channel = vscode.window.createOutputChannel('SeedCode');
    context.subscriptions.push(this.channel);
    this.info('SeedCode extension logger initialized.');
  }

  public info(message: string): void {
    this.log('INFO', message);
  }

  public warn(message: string): void {
    this.log('WARN', message);
  }

  public error(message: string, error?: unknown): void {
    const errorDetails = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error ?? '');
    this.log('ERROR', `${message}${errorDetails ? ` - ${errorDetails}` : ''}`);
  }

  public show(): void {
    this.channel?.show(true);
  }

  private log(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level}] ${message}`;
    if (this.channel) {
      this.channel.appendLine(formatted);
    } else {
      console.log(formatted);
    }
  }
}

export const logger = new Logger();
