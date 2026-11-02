import * as vscode from 'vscode';
import { SeedCodeEditorPanel } from '../providers/seedcodeEditorPanel';
import { logger } from '../utils/logger';

export function registerOpenInEditorCommand(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand('seedcode.openInEditor', () => {
    logger.info('Executing command: seedcode.openInEditor');
    SeedCodeEditorPanel.show(context.extensionUri);
  });

  context.subscriptions.push(disposable);
}
