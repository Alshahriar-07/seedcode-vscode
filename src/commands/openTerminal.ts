import * as vscode from 'vscode';
import { logger } from '../utils/logger';

export async function registerOpenTerminalCommand(context: vscode.ExtensionContext): Promise<void> {
  const disposable = vscode.commands.registerCommand('seedcode.openTerminal', async () => {
    logger.info('Executing command: seedcode.openTerminal');
    await vscode.commands.executeCommand('seedcode.cliView.focus');
  });

  context.subscriptions.push(disposable);
}
