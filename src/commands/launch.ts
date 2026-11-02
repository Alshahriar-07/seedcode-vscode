import * as vscode from 'vscode';
import { CliDetector } from '../services/cliDetector';
import { PtySessionManager } from '../services/ptySessionManager';
import { PathResolver } from '../utils/paths';
import { logger } from '../utils/logger';

export async function registerLaunchCommand(context: vscode.ExtensionContext): Promise<void> {
  const disposable = vscode.commands.registerCommand('seedcode.launch', async () => {
    logger.info('Executing command: seedcode.launch');

    // Reveal and focus the SeedCode Activity Bar view
    await vscode.commands.executeCommand('seedcode.cliView.focus');

    // Check if CLI is installed
    const cliResult = await CliDetector.detect();
    if (!cliResult.installed) {
      logger.warn('SeedCode CLI is not installed.');
      return;
    }

    const ptyMgr = PtySessionManager.getInstance();
    if (!ptyMgr.running && cliResult.executablePath) {
      const { cwd } = PathResolver.getEffectiveWorkingDirectory();
      ptyMgr.start({
        executable: cliResult.executablePath,
        cwd
      });
    }
  });

  context.subscriptions.push(disposable);
}
