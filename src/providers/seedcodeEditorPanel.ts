import * as vscode from 'vscode';
import { SeedCodeWebviewHost } from './seedCodeWebviewHost';
import { logger } from '../utils/logger';

/**
 * Hosts the SeedCode CLI webview inside a normal editor tab.
 *
 * Only one tab instance is kept: running the command again reveals the existing
 * tab instead of opening (and re-attaching) another webview.
 */
export class SeedCodeEditorPanel extends SeedCodeWebviewHost {
  public static readonly viewType = 'seedcode.editorPanel';
  public static readonly title = 'SeedCode CLI';

  private static current: SeedCodeEditorPanel | undefined;

  private panel?: vscode.WebviewPanel;

  private constructor(extensionUri: vscode.Uri) {
    super(extensionUri);
  }

  public static get currentPanel(): SeedCodeEditorPanel | undefined {
    return SeedCodeEditorPanel.current;
  }

  /**
   * Opens the SeedCode CLI in the editor area, or reveals the open tab.
   */
  public static show(extensionUri: vscode.Uri): SeedCodeEditorPanel {
    const existing = SeedCodeEditorPanel.current;
    if (existing && existing.panel) {
      existing.panel.reveal(undefined, false);
      return existing;
    }

    const instance = new SeedCodeEditorPanel(extensionUri);
    instance.createPanel();
    SeedCodeEditorPanel.current = instance;
    logger.info('SeedCode CLI editor tab opened.');
    return instance;
  }

  private createPanel(): void {
    const panel = vscode.window.createWebviewPanel(
      SeedCodeEditorPanel.viewType,
      SeedCodeEditorPanel.title,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    this.panel = panel;
    panel.iconPath = vscode.Uri.joinPath(this.extensionUri, 'assets', 'seedcode-colored-with-bg.svg');

    panel.onDidDispose(() => this.handlePanelDisposed());

    this.attachWebview(panel.webview);
  }

  private handlePanelDisposed(): void {
    this.panel = undefined;
    if (SeedCodeEditorPanel.current === this) {
      SeedCodeEditorPanel.current = undefined;
    }
    // Disposing this host only removes its own webview listeners. The shared PTY
    // session and the Activity Bar sidebar keep running.
    this.dispose();
    logger.info('SeedCode CLI editor tab closed.');
  }

  protected get webview(): vscode.Webview | undefined {
    return this.panel?.webview;
  }

  public dispose(): void {
    if (this.panel) {
      const panel = this.panel;
      this.panel = undefined;
      panel.dispose();
      return;
    }
    super.dispose();
  }
}
