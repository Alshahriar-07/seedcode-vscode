import * as vscode from 'vscode';
import { CliDetector } from '../services/cliDetector';
import { PtySessionManager } from '../services/ptySessionManager';
import { PathResolver } from '../utils/paths';
import { logger } from '../utils/logger';

export async function registerRestartCommand(context: vscode.ExtensionContext): Promise<void> {
  const disposable = vscode.commands.registerCommand('seedcode.restart', async () => {
    logger.info('Executing command: seedcode.restart');

    const cliResult = await CliDetector.detect();
    if (!cliResult.installed || !cliResult.executablePath) {
      vscode.window.showWarningMessage('SeedCode CLI is not installed yet. Please install it first.');
      await vscode.commands.executeCommand('seedcode.cliView.focus');
      return;
    }

    const { cwd } = PathResolver.getEffectiveWorkingDirectory();
    try {
      const ptyMgr = PtySessionManager.getInstance();
      ptyMgr.restart({
        executable: cliResult.executablePath,
        cwd
      });
      await vscode.commands.executeCommand('seedcode.cliView.focus');
      vscode.window.showInformationMessage('SeedCode CLI session restarted in the right sidebar.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Failed to restart SeedCode CLI', err);
      vscode.window.showErrorMessage(`Failed to restart SeedCode CLI: ${msg}`);
    }
  });

  context.subscriptions.push(disposable);
}
