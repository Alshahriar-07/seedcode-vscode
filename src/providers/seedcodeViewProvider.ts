import * as vscode from 'vscode';
import { InstallationManager, InstallationStatus } from '../services/installationManager';
import { PathResolver } from '../utils/paths';
import { logger } from '../utils/logger';

export class SeedCodeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'seedcode.view';

  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];

  constructor(private readonly extensionUri: vscode.Uri) {
    const installMgr = InstallationManager.getInstance();
    const sub = installMgr.onDidChangeStatus((status) => {
      this.updateWebviewContent(status);
    });
    this.disposables.push(sub);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };

    // Handle incoming messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      logger.info(`Webview message received: ${message.command}`);
      switch (message.command) {
        case 'launch':
          await vscode.commands.executeCommand('seedcode.launch');
          break;
        case 'install':
          await vscode.commands.executeCommand('seedcode.install');
          break;
        case 'restart':
          await vscode.commands.executeCommand('seedcode.restart');
          break;
        case 'openTerminal':
          await vscode.commands.executeCommand('seedcode.openTerminal');
          break;
        case 'checkInstallation':
          await vscode.commands.executeCommand('seedcode.checkInstallation');
          break;
        case 'openDocs':
          vscode.env.openExternal(vscode.Uri.parse('https://github.com/Alshahriar-07/seedcode-cli'));
          break;
      }
    });

    // Initial check and render
    const installMgr = InstallationManager.getInstance();
    this.updateWebviewContent(installMgr.getStatus());
    // Trigger real detection on view load
    installMgr.checkInstallation(false);
  }

  private updateWebviewContent(status: InstallationStatus): void {
    if (!this.view) {
      return;
    }
    this.view.webview.html = this.getHtmlForWebview(this.view.webview, status);
  }

  private getHtmlForWebview(webview: vscode.Webview, status: InstallationStatus): string {
    const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'assets', 'logo.png'));
    const { cwd, isWorkspace } = PathResolver.getEffectiveWorkingDirectory();
    const shortCwd = cwd.length > 36 ? '...' + cwd.slice(-33) : cwd;

    // Nonce for inline script security
    const nonce = getNonce();

    let stateContent = '';

    switch (status.state) {
      case 'checking':
        stateContent = `
          <div class="state-card">
            <div class="spinner"></div>
            <div class="status-title">Checking Installation</div>
            <div class="status-desc">Checking SeedCode CLI installation...</div>
          </div>
        `;
        break;

      case 'not_installed':
        stateContent = `
          <div class="state-card warning">
            <div class="status-title not-installed-title">SeedCode CLI is not installed on your device yet.</div>
            <p class="status-desc">Install the CLI to start pair programming with your AI terminal agent directly inside VS Code.</p>
            <button class="btn btn-primary" id="btn-install">
              <span class="codicon codicon-cloud-download"></span> Install SeedCode
            </button>
            <div class="platform-info">
              <span class="platform-label">Supported Platforms</span>
              <span class="platform-badges">Windows &nbsp;|&nbsp; Linux</span>
            </div>
          </div>
        `;
        break;

      case 'installing':
        stateContent = `
          <div class="state-card">
            <div class="spinner"></div>
            <div class="status-title">Installing SeedCode CLI...</div>
            <p class="status-desc">Installation command is currently running in the integrated terminal.</p>
            <button class="btn btn-secondary" id="btn-terminal">
              <span class="codicon codicon-terminal"></span> View Terminal Output
            </button>
            <div class="help-note">The extension will automatically verify and launch once installation completes.</div>
          </div>
        `;
        break;

      case 'installed': {
        const version = status.cliResult?.version || 'Ready';
        stateContent = `
          <div class="state-card success">
            <div class="badge-success">
              <span class="dot"></span> ${escapeHtml(version)}
            </div>
            
            <div class="workspace-pill" title="${escapeHtml(cwd)}">
              <span class="codicon codicon-folder"></span> ${isWorkspace ? 'Workspace' : 'Directory'}: <strong>${escapeHtml(shortCwd)}</strong>
            </div>

            <button class="btn btn-primary" id="btn-launch">
              <span class="codicon codicon-play"></span> Launch SeedCode CLI
            </button>

            <div class="button-group">
              <button class="btn btn-secondary" id="btn-restart" title="Restart terminal session">
                <span class="codicon codicon-refresh"></span> Restart
              </button>
              <button class="btn btn-secondary" id="btn-terminal" title="Focus integrated terminal">
                <span class="codicon codicon-terminal"></span> Terminal
              </button>
              <button class="btn btn-secondary" id="btn-refresh" title="Check CLI status">
                <span class="codicon codicon-sync"></span> Check
              </button>
            </div>

            <div class="tips-box">
              <div class="tips-header">Quick Terminal Commands</div>
              <div class="tip-item"><code>/help</code> — Show commands & shortcuts</div>
              <div class="tip-item"><code>/provider</code> — Configure AI provider</div>
              <div class="tip-item"><code>/model</code> — Switch AI models</div>
              <div class="tip-item"><code>/doctor</code> — Diagnose environment</div>
            </div>
          </div>
        `;
        break;
      }

      case 'failed':
        stateContent = `
          <div class="state-card error">
            <div class="status-title error-title">Installation Failed</div>
            <p class="status-desc">${escapeHtml(status.message || 'An error occurred during installation.')}</p>
            ${status.error ? `<div class="error-details"><code>${escapeHtml(status.error)}</code></div>` : ''}
            <div class="button-group">
              <button class="btn btn-primary" id="btn-install">
                <span class="codicon codicon-refresh"></span> Retry Installation
              </button>
              <button class="btn btn-secondary" id="btn-terminal">
                <span class="codicon codicon-terminal"></span> Open Terminal
              </button>
            </div>
            <button class="btn btn-secondary full-width" id="btn-refresh">
              <span class="codicon codicon-sync"></span> Recheck Status
            </button>
          </div>
        `;
        break;

      case 'unsupported':
        stateContent = `
          <div class="state-card error">
            <div class="status-title error-title">Unsupported Platform</div>
            <p class="status-desc">${escapeHtml(status.message || 'Your operating system is not supported for automated CLI installation.')}</p>
            <div class="platform-info">
              <span class="platform-label">Official Support</span>
              <span class="platform-badges">Windows &nbsp;|&nbsp; Linux</span>
            </div>
          </div>
        `;
        break;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SeedCode CLI</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: var(--vscode-sideBar-background);
      color: var(--vscode-sideBar-foreground, var(--vscode-foreground));
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      line-height: 1.45;
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .header-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 24px;
      width: 100%;
    }
    .logo {
      width: 68px;
      height: 68px;
      margin-bottom: 12px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      border-radius: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }
    .title {
      font-size: 19px;
      font-weight: 600;
      color: var(--vscode-foreground);
      margin-bottom: 4px;
      letter-spacing: -0.2px;
    }
    .tagline {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      max-width: 240px;
      line-height: 1.4;
    }
    .state-card {
      width: 100%;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border, var(--vscode-input-border, rgba(128, 128, 128, 0.2)));
      border-radius: 8px;
      padding: 18px 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    .status-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }
    .not-installed-title {
      font-size: 13.5px;
      font-weight: 500;
      color: var(--vscode-editorWarning-foreground, #cca700);
      margin-bottom: 2px;
    }
    .error-title {
      color: var(--vscode-errorForeground, #f14c4c);
    }
    .status-desc {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      line-height: 1.4;
    }
    .btn {
      width: 100%;
      padding: 9px 14px;
      border: 1px solid transparent;
      border-radius: 4px;
      font-family: inherit;
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background 0.15s ease, border-color 0.15s ease;
      text-decoration: none;
    }
    .btn-primary {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .btn-primary:hover {
      background-color: var(--vscode-button-hoverBackground);
    }
    .btn-secondary {
      background-color: var(--vscode-button-secondaryBackground, rgba(128, 128, 128, 0.15));
      color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    }
    .btn-secondary:hover {
      background-color: var(--vscode-button-secondaryHoverBackground, rgba(128, 128, 128, 0.25));
    }
    .button-group {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
      width: 100%;
    }
    .button-group .btn {
      padding: 7px 6px;
      font-size: 11.5px;
    }
    .full-width {
      width: 100%;
    }
    .platform-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
      padding-top: 10px;
      border-top: 1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.15));
      width: 100%;
    }
    .platform-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
      font-weight: 500;
    }
    .platform-badges {
      font-size: 12px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }
    .badge-success {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(46, 204, 113, 0.15);
      color: #2ecc71;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11.5px;
      font-weight: 600;
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #2ecc71;
      box-shadow: 0 0 6px #2ecc71;
    }
    .workspace-pill {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-badge-background, rgba(128, 128, 128, 0.1));
      padding: 5px 8px;
      border-radius: 4px;
      width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: left;
    }
    .workspace-pill strong {
      color: var(--vscode-foreground);
    }
    .tips-box {
      width: 100%;
      text-align: left;
      margin-top: 4px;
      padding-top: 10px;
      border-top: 1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.15));
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .tips-header {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 2px;
    }
    .tip-item {
      font-size: 11.5px;
      color: var(--vscode-foreground);
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    .tip-item code {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px;
      background: rgba(128, 128, 128, 0.18);
      padding: 2px 4px;
      border-radius: 3px;
      color: var(--vscode-textPreformat-foreground, #7bed9f);
    }
    .help-note {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      font-style: italic;
    }
    .error-details {
      background: rgba(241, 76, 76, 0.1);
      border: 1px solid rgba(241, 76, 76, 0.3);
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 11px;
      text-align: left;
      width: 100%;
      overflow-x: auto;
    }
    .spinner {
      width: 26px;
      height: 26px;
      border: 3px solid rgba(128, 128, 128, 0.25);
      border-top-color: var(--vscode-button-background);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .footer {
      margin-top: auto;
      padding-top: 24px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .footer a {
      color: var(--vscode-textLink-foreground);
      text-decoration: none;
      cursor: pointer;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="header-container">
    <img src="${logoUri}" alt="SeedCode Logo" class="logo" />
    <h1 class="title">SeedCode CLI</h1>
    <p class="tagline">Your AI coding agent, built for the terminal.</p>
  </div>

  ${stateContent}

  <div class="footer">
    <div>Created by Al Shahriar Sowan</div>
    <div><a id="link-docs">Documentation & GitHub</a></div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    function bindClick(id, command) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', () => {
          vscode.postMessage({ command });
        });
      }
    }

    bindClick('btn-launch', 'launch');
    bindClick('btn-install', 'install');
    bindClick('btn-restart', 'restart');
    bindClick('btn-terminal', 'openTerminal');
    bindClick('btn-refresh', 'checkInstallation');
    bindClick('link-docs', 'openDocs');
  </script>
</body>
</html>`;
  }

  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
