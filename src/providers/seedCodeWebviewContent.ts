import * as vscode from 'vscode';
import { InstallationStatus } from '../services/installationManager';
import { PathResolver } from '../utils/paths';

/**
 * Shared webview markup for every SeedCode CLI surface (Activity Bar sidebar and editor tab).
 * Both hosts render exactly the same document so the two interfaces stay in sync.
 */

/**
 * Generates the embedded terminal interface.
 */
export function buildTerminalHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  status: InstallationStatus
): string {
  const xtermCssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'xterm.css'));
  const xtermJsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'xterm.js'));
  const addonFitJsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'addon-fit.js'));
  const terminalJsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'terminal.js'));
  const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'logo.png'));

  const iconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'seedcode-colored-with-bg.svg'));

  const { cwd } = PathResolver.getEffectiveWorkingDirectory();
  const shortCwd = cwd.length > 28 ? '...' + cwd.slice(-25) : cwd;
  const version = status.cliResult?.version || 'SeedCode CLI';

  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SeedCode CLI</title>
  <link rel="stylesheet" href="${xtermCssUri}">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      height: 100%;
      width: 100%;
      overflow: hidden;
      background-color: var(--vscode-sideBar-background, var(--vscode-editor-background));
      color: var(--vscode-sideBar-foreground, var(--vscode-foreground));
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif);
      display: flex;
      flex-direction: column;
    }
    .top-toolbar {
      height: 38px;
      min-height: 38px;
      padding: 0 10px;
      background: var(--vscode-sideBarSectionHeader-background, rgba(128, 128, 128, 0.08));
      border-bottom: 1px solid var(--vscode-sideBar-border, rgba(128, 128, 128, 0.2));
      display: flex;
      align-items: center;
      justify-content: space-between;
      user-select: none;
    }
    .brand-section {
      display: flex;
      align-items: center;
      gap: 7px;
      overflow: hidden;
    }
    .brand-logo {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      image-rendering: pixelated;
    }
    .brand-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--vscode-foreground);
      white-space: nowrap;
    }
    .cwd-badge {
      font-size: 10.5px;
      color: var(--vscode-descriptionForeground);
      background: rgba(128, 128, 128, 0.12);
      padding: 2px 6px;
      border-radius: 3px;
      max-width: 130px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .action-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--vscode-icon-foreground, var(--vscode-foreground));
      padding: 3px 6px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      font-size: 11px;
      line-height: 1;
      opacity: 0.85;
      transition: opacity 0.15s, background 0.15s;
    }
    .action-btn:hover {
      opacity: 1;
      background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.2));
    }
    .icon-btn {
      width: 24px;
      height: 22px;
      padding: 0;
      justify-content: center;
    }
    .brand-icon {
      display: block;
      width: 16px;
      height: 16px;
      object-fit: contain;
      image-rendering: pixelated;
    }
    #terminal-container {
      flex: 1;
      width: 100%;
      height: calc(100% - 38px);
      padding: 4px 6px;
      background-color: var(--vscode-terminal-background, var(--vscode-editor-background, #181818));
      overflow: hidden;
    }
    .xterm {
      height: 100%;
      width: 100%;
    }
    .xterm-viewport {
      overflow-y: auto !important;
    }
  </style>
</head>
<body>
  <div class="top-toolbar">
    <div class="brand-section">
      <img src="${logoUri}" alt="SeedCode CLI" class="brand-logo" />
      <span class="brand-title" title="${escapeHtml(version)}">SeedCode CLI</span>
      <span class="cwd-badge" title="${escapeHtml(cwd)}">${escapeHtml(shortCwd)}</span>
    </div>
    <div class="toolbar-actions">
      <button class="action-btn icon-btn" id="btn-open-editor" title="Open in Editor Tab" aria-label="Open in Editor Tab">
        <img class="brand-icon" src="${iconUri}" alt="" aria-hidden="true" />
      </button>
      <button class="action-btn" id="btn-term-clear" title="Clear Terminal">Clear</button>
      <button class="action-btn" id="btn-term-restart" title="Restart CLI Session">Restart</button>
    </div>
  </div>

  <div id="terminal-container"></div>

  <script nonce="${nonce}" src="${xtermJsUri}"></script>
  <script nonce="${nonce}" src="${addonFitJsUri}"></script>
  <script nonce="${nonce}" src="${terminalJsUri}"></script>
</body>
</html>`;
}

/**
 * Generates the setup / installation screen.
 */
export function buildInstallationHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  status: InstallationStatus
): string {
  const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'logo.png'));
  const nonce = getNonce();

  let bodyHtml = '';

  if (status.state === 'checking') {
    bodyHtml = `
      <div class="card">
        <div class="spinner"></div>
        <div class="card-title">Checking SeedCode CLI...</div>
        <p class="card-desc">Detecting environment and installation paths...</p>
      </div>
    `;
  } else if (status.state === 'not_installed') {
    bodyHtml = `
      <div class="card">
        <div class="card-title warning-text">SeedCode CLI is not installed on this device yet.</div>
        <p class="card-desc">Install SeedCode CLI to start pair-programming with your AI coding agent directly inside VS Code.</p>
        <button class="btn btn-primary" id="btn-install">Install SeedCode CLI</button>
        <div class="platform-section">
          <span class="platform-label">Supported Platforms</span>
          <span class="platform-text">Windows &nbsp;|&nbsp; Linux</span>
        </div>
      </div>
    `;
  } else if (status.state === 'installing') {
    bodyHtml = `
      <div class="card">
        <div class="spinner"></div>
        <div class="card-title">Installing SeedCode CLI...</div>
        <p class="card-desc">The official installer is running. SeedCode CLI will automatically initialize here as soon as installation completes.</p>
      </div>
    `;
  } else if (status.state === 'failed') {
    bodyHtml = `
      <div class="card">
        <div class="card-title error-text">Installation Failed</div>
        <p class="card-desc">${escapeHtml(status.message || 'Could not complete CLI installation.')}</p>
        ${status.error ? `<div class="error-code"><code>${escapeHtml(status.error)}</code></div>` : ''}
        <button class="btn btn-primary" id="btn-install">Retry Installation</button>
        <button class="btn btn-secondary" id="btn-check">Recheck Status</button>
      </div>
    `;
  } else if (status.state === 'unsupported') {
    bodyHtml = `
      <div class="card">
        <div class="card-title error-text">Unsupported Platform</div>
        <p class="card-desc">${escapeHtml(status.message || 'Automated installer supports Windows and Linux.')}</p>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SeedCode CLI Setup</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: var(--vscode-sideBar-background, var(--vscode-editor-background));
      color: var(--vscode-sideBar-foreground, var(--vscode-foreground));
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      text-align: center;
    }
    .hero {
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .logo {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      image-rendering: pixelated;
      margin-bottom: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }
    .hero-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-foreground);
      margin-bottom: 4px;
    }
    .hero-tagline {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      max-width: 240px;
    }
    .card {
      width: 100%;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.2));
      border-radius: 8px;
      padding: 16px 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .card-title {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }
    .warning-text {
      color: var(--vscode-editorWarning-foreground, #cca700);
    }
    .error-text {
      color: var(--vscode-errorForeground, #f14c4c);
    }
    .card-desc {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      line-height: 1.4;
    }
    .btn {
      width: 100%;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid transparent;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, rgba(128,128,128,0.15));
      color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    }
    .platform-section {
      width: 100%;
      padding-top: 10px;
      border-top: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.15));
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .platform-label {
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
    }
    .platform-text {
      font-size: 12px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid rgba(128,128,128,0.25);
      border-top-color: var(--vscode-button-background);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .error-code {
      font-family: monospace;
      font-size: 11px;
      background: rgba(241,76,76,0.1);
      color: var(--vscode-errorForeground, #f14c4c);
      padding: 6px;
      border-radius: 4px;
      text-align: left;
      width: 100%;
      overflow-x: auto;
    }
    .footer {
      margin-top: auto;
      padding-top: 20px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .footer a {
      color: var(--vscode-textLink-foreground);
      text-decoration: none;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="hero">
    <img src="${logoUri}" alt="SeedCode CLI" class="logo" />
    <h1 class="hero-title">SeedCode CLI</h1>
    <p class="hero-tagline">Your AI coding agent, built for the terminal.</p>
  </div>

  ${bodyHtml}

  <div class="footer">
    <div>Created by Al Shahriar Sowan</div>
    <div><a id="link-docs">Documentation &amp; GitHub</a></div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const btnInstall = document.getElementById('btn-install');
    if (btnInstall) {
      btnInstall.addEventListener('click', () => vscode.postMessage({ type: 'install' }));
    }
    const btnCheck = document.getElementById('btn-check');
    if (btnCheck) {
      btnCheck.addEventListener('click', () => vscode.postMessage({ type: 'checkInstallation' }));
    }
    const linkDocs = document.getElementById('link-docs');
    if (linkDocs) {
      linkDocs.addEventListener('click', () => vscode.postMessage({ type: 'openDocs' }));
    }
  </script>
</body>
</html>`;
}

export function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
