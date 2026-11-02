import * as vscode from 'vscode';
import { InstallationManager } from '../services/installationManager';
import { CliDetector } from '../services/cliDetector';
import { logger } from '../utils/logger';

export async function registerCheckInstallationCommand(context: vscode.ExtensionContext): Promise<void> {
  const disposable = vscode.commands.registerCommand('seedcode.checkInstallation', async () => {
    logger.info('Executing command: seedcode.checkInstallation');
    CliDetector.invalidateCache();

    const installMgr = InstallationManager.getInstance();
    const status = await installMgr.checkInstallation(true);

    if (status.state === 'installed') {
      const ver = status.cliResult?.version || 'Ready';
      vscode.window.showInformationMessage(`SeedCode CLI is ready: ${ver}`);
    } else if (status.state === 'not_installed') {
      const action = await vscode.window.showWarningMessage(
        'SeedCode CLI is not installed on this device.',
        'Install Now'
      );
      if (action === 'Install Now') {
        await vscode.commands.executeCommand('seedcode.install');
      }
    } else if (status.state === 'unsupported') {
      vscode.window.showErrorMessage(status.message || 'Operating system not supported.');
    } else if (status.state === 'failed') {
      vscode.window.showErrorMessage(`Installation check failed: ${status.error || status.message}`);
    }
  });

  context.subscriptions.push(disposable);
}
