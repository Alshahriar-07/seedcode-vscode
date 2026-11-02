import * as vscode from 'vscode';
import { CliDetector } from '../services/cliDetector';
import { TerminalManager } from '../services/terminalManager';
import { PathResolver } from '../utils/paths';
import { logger } from '../utils/logger';

export async function registerRestartCommand(context: vscode.ExtensionContext): Promise<void> {
  const disposable = vscode.commands.registerCommand('seedcode.restart', async () => {
    logger.info('Executing command: seedcode.restart');

    const cliResult = await CliDetector.detect();
    if (!cliResult.installed) {
      vscode.window.showWarningMessage('SeedCode CLI is not installed yet. Please install it first.');
      await vscode.commands.executeCommand('seedcode.view.focus');
      return;
    }

    const { cwd } = PathResolver.getEffectiveWorkingDirectory();
    try {
      TerminalManager.getInstance().restartCli(cwd);
      vscode.window.showInformationMessage('SeedCode CLI session restarted.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Failed to restart SeedCode CLI', err);
      vscode.window.showErrorMessage(`Failed to restart SeedCode CLI: ${msg}`);
    }
  });

  context.subscriptions.push(disposable);
}
