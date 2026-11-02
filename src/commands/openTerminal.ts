import * as vscode from 'vscode';
import { TerminalManager } from '../services/terminalManager';
import { logger } from '../utils/logger';

export async function registerOpenTerminalCommand(context: vscode.ExtensionContext): Promise<void> {
  const disposable = vscode.commands.registerCommand('seedcode.openTerminal', async () => {
    logger.info('Executing command: seedcode.openTerminal');
    const terminalMgr = TerminalManager.getInstance();
    const existing = terminalMgr.findExistingTerminal();

    if (existing) {
      existing.show();
    } else {
      await vscode.commands.executeCommand('seedcode.launch');
    }
  });

  context.subscriptions.push(disposable);
}
