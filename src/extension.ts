import * as vscode from 'vscode';
import { logger } from './utils/logger';
import { SeedCodeViewProvider } from './providers/seedcodeViewProvider';
import { registerOpenCommand } from './commands/open';
import { registerLaunchCommand } from './commands/launch';
import { registerInstallCommand } from './commands/install';
import { registerRestartCommand } from './commands/restart';
import { registerCheckInstallationCommand } from './commands/checkInstallation';
import { registerOpenTerminalCommand } from './commands/openTerminal';
import { registerOpenInEditorCommand } from './commands/openInEditor';
import { PtySessionManager } from './services/ptySessionManager';
import { InstallationManager } from './services/installationManager';

export function activate(context: vscode.ExtensionContext): void {
  logger.initialize(context);
  logger.info('SeedCode CLI extension activated (Activity Bar sidebar + editor tab).');

  // Register Webview View Provider for the Activity Bar SeedCode container
  const provider = new SeedCodeViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SeedCodeViewProvider.viewType, provider, {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    })
  );
  context.subscriptions.push(provider);

  // Register commands
  registerOpenCommand(context);
  registerLaunchCommand(context);
  registerInstallCommand(context);
  registerRestartCommand(context);
  registerCheckInstallationCommand(context);
  registerOpenTerminalCommand(context);
  registerOpenInEditorCommand(context);
}

export function deactivate(): void {
  logger.info('SeedCode extension deactivating...');
  PtySessionManager.getInstance().dispose();
  InstallationManager.getInstance().dispose();
}
