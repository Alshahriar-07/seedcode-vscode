import * as vscode from 'vscode';
import { logger } from './utils/logger';
import { SeedCodeViewProvider } from './providers/seedcodeViewProvider';
import { registerOpenCommand } from './commands/open';
import { registerLaunchCommand } from './commands/launch';
import { registerInstallCommand } from './commands/install';
import { registerRestartCommand } from './commands/restart';
import { registerCheckInstallationCommand } from './commands/checkInstallation';
import { registerOpenTerminalCommand } from './commands/openTerminal';
import { TerminalManager } from './services/terminalManager';
import { InstallationManager } from './services/installationManager';

export function activate(context: vscode.ExtensionContext): void {
  // Initialize extension logger
  logger.initialize(context);
  logger.info('SeedCode VS Code extension activated.');

  // Register Webview View Provider in the Activity Bar
  const provider = new SeedCodeViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SeedCodeViewProvider.viewType, provider, {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    })
  );
  context.subscriptions.push(provider);

  // Register extension commands
  registerOpenCommand(context);
  registerLaunchCommand(context);
  registerInstallCommand(context);
  registerRestartCommand(context);
  registerCheckInstallationCommand(context);
  registerOpenTerminalCommand(context);
}

export function deactivate(): void {
  logger.info('SeedCode extension deactivating...');
  TerminalManager.getInstance().dispose();
  InstallationManager.getInstance().dispose();
}
