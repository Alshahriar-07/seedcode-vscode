import * as vscode from 'vscode';
import { logger } from '../utils/logger';

export async function registerOpenCommand(context: vscode.ExtensionContext): Promise<void> {
  const disposable = vscode.commands.registerCommand('seedcode.open', async () => {
    logger.info('Executing command: seedcode.open');
    await vscode.commands.executeCommand('seedcode.view.focus');
  });

  context.subscriptions.push(disposable);
}
