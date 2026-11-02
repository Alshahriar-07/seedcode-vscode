import * as vscode from 'vscode';
import { InstallationManager, InstallationStatus } from '../services/installationManager';
import { CliDetector } from '../services/cliDetector';
import { PtySessionManager } from '../services/ptySessionManager';
import { PathResolver } from '../utils/paths';
import { logger } from '../utils/logger';
import { buildInstallationHtml, buildTerminalHtml } from './seedCodeWebviewContent';

/**
 * Shared behaviour for every surface that hosts the SeedCode CLI webview.
 *
 * The Activity Bar sidebar (`SeedCodeViewProvider`) and the editor tab
 * (`SeedCodeEditorPanel`) both extend this class, so message handling, PTY
 * forwarding, installation state rendering and the HTML itself are implemented
 * once. All hosts talk to the same singleton PTY session, so opening a second
 * surface never spawns a second CLI process.
 */
export abstract class SeedCodeWebviewHost implements vscode.Disposable {
  protected disposables: vscode.Disposable[] = [];
  private ptyDataListener?: () => void;
  private ptyExitListener?: () => void;

  protected constructor(protected readonly extensionUri: vscode.Uri) {
    const installMgr = InstallationManager.getInstance();
    this.disposables.push(
      installMgr.onDidChangeStatus((status) => {
        this.render(status);
      })
    );
  }

  /** The webview currently connected to this host, if any. */
  protected abstract get webview(): vscode.Webview | undefined;

  /**
   * Wires a freshly created webview (view or panel) to the shared backend.
   */
  protected attachWebview(webview: vscode.Webview): void {
    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this.extensionUri,
        vscode.Uri.joinPath(this.extensionUri, 'assets'),
        vscode.Uri.joinPath(this.extensionUri, 'media')
      ]
    };

    this.setupPtyForwarding();

    this.disposables.push(
      webview.onDidReceiveMessage((message) => {
        void this.handleWebviewMessage(message);
      })
    );

    const installMgr = InstallationManager.getInstance();
    void installMgr.checkInstallation(false).then((status) => {
      this.render(status);
    });
  }

  protected render(status: InstallationStatus): void {
    const webview = this.webview;
    if (!webview) {
      return;
    }

    if (status.state === 'installed') {
      webview.html = buildTerminalHtml(webview, this.extensionUri, status);
    } else {
      webview.html = buildInstallationHtml(webview, this.extensionUri, status);
    }
  }

  protected postMessage(message: unknown): void {
    void this.webview?.postMessage(message);
  }

  private setupPtyForwarding(): void {
    const ptyMgr = PtySessionManager.getInstance();

    if (this.ptyDataListener) {
      this.ptyDataListener();
    }
    if (this.ptyExitListener) {
      this.ptyExitListener();
    }

    this.ptyDataListener = ptyMgr.onData((data: string) => {
      this.postMessage({ type: 'output', data });
    });

    this.ptyExitListener = ptyMgr.onExit((status) => {
      logger.info(`PTY exit reported to webview host: code ${status.exitCode}`);
      this.postMessage({
        type: 'output',
        data: `\r\n\x1b[90m[SeedCode session ended. Exit code: ${status.exitCode}]\x1b[0m\r\n`
      });
    });
  }

  private async handleWebviewMessage(message: any): Promise<void> {
    const ptyMgr = PtySessionManager.getInstance();

    switch (message?.type) {
      case 'ready': {
        const cliResult = await CliDetector.detect();
        if (cliResult.installed && cliResult.executablePath) {
          const { cwd } = PathResolver.getEffectiveWorkingDirectory();
          const cols = message.cols || 80;
          const rows = message.rows || 30;

          if (!ptyMgr.running) {
            try {
              ptyMgr.start({
                executable: cliResult.executablePath,
                cwd,
                cols,
                rows
              });
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              this.postMessage({
                type: 'output',
                data: `\r\n\x1b[31mFailed to start SeedCode CLI terminal: ${msg}\x1b[0m\r\n`
              });
            }
          } else {
            // Replay buffer to the newly connected webview (shared PTY session)
            const existingBuffer = ptyMgr.getBuffer();
            if (existingBuffer) {
              this.postMessage({ type: 'output', data: existingBuffer });
            }
            ptyMgr.resize(cols, rows);
          }
        }
        break;
      }

      case 'input': {
        if (message.data) {
          ptyMgr.write(message.data);
        }
        break;
      }

      case 'resize': {
        if (message.cols && message.rows) {
          ptyMgr.resize(message.cols, message.rows);
        }
        break;
      }

      case 'restart': {
        await vscode.commands.executeCommand('seedcode.restart');
        break;
      }

      case 'clear': {
        this.postMessage({ type: 'clear' });
        break;
      }

      // Toolbar / view action commands
      case 'openInEditor': {
        await vscode.commands.executeCommand('seedcode.openInEditor');
        break;
      }

      case 'install': {
        await vscode.commands.executeCommand('seedcode.install');
        break;
      }

      case 'checkInstallation': {
        await vscode.commands.executeCommand('seedcode.checkInstallation');
        break;
      }

      case 'openDocs': {
        void vscode.env.openExternal(vscode.Uri.parse('https://github.com/Alshahriar-07/seedcode-cli'));
        break;
      }
    }
  }

  public restartPty(): void {
    const ptyMgr = PtySessionManager.getInstance();
    void CliDetector.detect().then((res) => {
      if (res.installed && res.executablePath) {
        const { cwd } = PathResolver.getEffectiveWorkingDirectory();
        ptyMgr.restart({
          executable: res.executablePath,
          cwd
        });
      }
    });
  }

  public dispose(): void {
    if (this.ptyDataListener) {
      this.ptyDataListener();
      this.ptyDataListener = undefined;
    }
    if (this.ptyExitListener) {
      this.ptyExitListener();
      this.ptyExitListener = undefined;
    }
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
