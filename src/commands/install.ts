import * as vscode from 'vscode';
import { InstallationManager } from '../services/installationManager';
import { logger } from '../utils/logger';

export async function registerInstallCommand(context: vscode.ExtensionContext): Promise<void> {
  const disposable = vscode.commands.registerCommand('seedcode.install', async () => {
    logger.info('Executing command: seedcode.install');
    await vscode.commands.executeCommand('seedcode.cliView.focus');
    const installMgr = InstallationManager.getInstance();
    await installMgr.install();
  });

  context.subscriptions.push(disposable);
}
