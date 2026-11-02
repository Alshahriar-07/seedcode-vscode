import * as vscode from 'vscode';
import { SeedCodeWebviewHost } from './seedCodeWebviewHost';

/**
 * Activity Bar sidebar host for the SeedCode CLI webview.
 * The view ID must match `contributes.views.seedcode` in package.json.
 */
export class SeedCodeViewProvider extends SeedCodeWebviewHost implements vscode.WebviewViewProvider {
  public static readonly viewType = 'seedcode.cliView';

  private view?: vscode.WebviewView;

  constructor(extensionUri: vscode.Uri) {
    super(extensionUri);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.onDidDispose(() => {
      if (this.view === webviewView) {
        this.view = undefined;
      }
    });

    this.attachWebview(webviewView.webview);
  }

  protected get webview(): vscode.Webview | undefined {
    return this.view?.webview;
  }
}
