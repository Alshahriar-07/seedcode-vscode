import * as vscode from 'vscode';
import { CliDetector } from '../services/cliDetector';
import { TerminalManager } from '../services/terminalManager';
import { InstallationManager } from '../services/installationManager';
import { PathResolver } from '../utils/paths';
import { logger } from '../utils/logger';

export async function registerLaunchCommand(context: vscode.ExtensionContext): Promise<void> {
  const disposable = vscode.commands.registerCommand('seedcode.launch', async () => {
    logger.info('Executing command: seedcode.launch');

    // Check workspace
    const { cwd, isWorkspace } = PathResolver.getEffectiveWorkingDirectory();
    if (!isWorkspace) {
      const choice = await vscode.window.showWarningMessage(
        'No project folder or workspace is currently open. SeedCode works best inside a project directory.',
        'Open Folder',
        'Continue in Home Directory'
      );

      if (choice === 'Open Folder') {
        await vscode.commands.executeCommand('vscode.openFolder');
        return;
      }
    }

    // Check if CLI is installed
    const cliResult = await CliDetector.detect();

    if (!cliResult.installed) {
      logger.warn('SeedCode CLI is not installed. Prompting user to install.');
      // Open the SeedCode sidebar view
      await vscode.commands.executeCommand('seedcode.view.focus');

      const action = await vscode.window.showInformationMessage(
        'SeedCode CLI is not installed on your system yet. Would you like to install it now?',
        'Install SeedCode',
        'Cancel'
      );

      if (action === 'Install SeedCode') {
        await vscode.commands.executeCommand('seedcode.install');
      }
      return;
    }

    // Launch or focus the integrated terminal
    try {
      const terminalMgr = TerminalManager.getInstance();
      terminalMgr.launchCli(cwd);
      // Update installation manager state to ensure UI reflects 'installed'
      InstallationManager.getInstance().checkInstallation(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Failed to launch SeedCode CLI terminal', err);
      vscode.window.showErrorMessage(`Failed to launch SeedCode CLI: ${msg}`);
    }
  });

  context.subscriptions.push(disposable);
}
