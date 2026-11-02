import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';

/**
 * Utility functions for resolving workspace and file system paths.
 */
export class PathResolver {
  /**
   * Returns the primary workspace folder path.
   * If multiple folders are open, tries to find the one matching the active text editor.
   */
  public static getWorkspaceRoot(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return undefined;
    }

    // If an editor is active and belongs to a workspace folder, prefer that folder
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const activeFolder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
      if (activeFolder) {
        return activeFolder.uri.fsPath;
      }
    }

    return folders[0].uri.fsPath;
  }

  /**
   * Returns the effective working directory to launch the CLI.
   * If a workspace is open, returns it. Otherwise returns user's home directory.
   */
  public static getEffectiveWorkingDirectory(): { cwd: string; isWorkspace: boolean } {
    const workspaceRoot = this.getWorkspaceRoot();
    if (workspaceRoot) {
      return { cwd: workspaceRoot, isWorkspace: true };
    }

    return { cwd: os.homedir(), isWorkspace: false };
  }

  /**
   * Expands tilde (~) prefix to user home directory.
   */
  public static expandHome(filePath: string): string {
    if (filePath.startsWith('~')) {
      return path.join(os.homedir(), filePath.slice(1));
    }
    return filePath;
  }
}
