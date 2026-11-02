import * as vscode from 'vscode';
import { PlatformDetector, PlatformInfo } from './platformDetector';
import { CliDetector, CliDetectionResult } from './cliDetector';
import { TerminalManager } from './terminalManager';
import { logger } from '../utils/logger';

export type InstallationState =
  | 'checking'
  | 'not_installed'
  | 'installing'
  | 'installed'
  | 'failed'
  | 'unsupported';

export interface InstallationStatus {
  state: InstallationState;
  platform: PlatformInfo;
  cliResult?: CliDetectionResult;
  message?: string;
  error?: string;
}

export class InstallationManager {
  private static instance: InstallationManager;
  private currentStatus: InstallationStatus;
  private onDidChangeStatusEmitter = new vscode.EventEmitter<InstallationStatus>();
  public readonly onDidChangeStatus = this.onDidChangeStatusEmitter.event;

  private isPolling = false;
  private pollCancellation: (() => void) | null = null;

  private constructor() {
    const platform = PlatformDetector.getPlatformInfo();
    this.currentStatus = {
      state: platform.isSupported ? 'checking' : 'unsupported',
      platform,
      message: platform.isSupported ? 'Checking SeedCode CLI installation...' : `Operating system ${platform.name} is currently not supported for automated CLI installation.`
    };
  }

  public static getInstance(): InstallationManager {
    if (!InstallationManager.instance) {
      InstallationManager.instance = new InstallationManager();
    }
    return InstallationManager.instance;
  }

  public getStatus(): InstallationStatus {
    return this.currentStatus;
  }

  private updateStatus(newStatus: Partial<InstallationStatus>): void {
    this.currentStatus = {
      ...this.currentStatus,
      ...newStatus
    };
    logger.info(`Installation status updated: ${this.currentStatus.state} - ${this.currentStatus.message || ''}`);
    this.onDidChangeStatusEmitter.fire(this.currentStatus);
  }

  /**
   * Checks the current installation status of SeedCode CLI.
   */
  public async checkInstallation(forceRefresh = true): Promise<InstallationStatus> {
    const platform = PlatformDetector.getPlatformInfo();

    if (!platform.isSupported) {
      this.updateStatus({
        state: 'unsupported',
        platform,
        message: `Operating system ${platform.name} is not supported for automated installation. SeedCode CLI officially supports Windows and Linux.`
      });
      return this.currentStatus;
    }

    this.updateStatus({
      state: 'checking',
      platform,
      message: 'Checking SeedCode CLI installation...'
    });

    try {
      const cliResult = await CliDetector.detect(forceRefresh);

      if (cliResult.installed) {
        this.updateStatus({
          state: 'installed',
          cliResult,
          message: `SeedCode CLI is installed and ready (${cliResult.version || 'Version detected'}).`,
          error: undefined
        });
      } else {
        this.updateStatus({
          state: 'not_installed',
          cliResult,
          message: 'SeedCode CLI is not installed on your device yet.',
          error: undefined
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Error during installation check', err);
      this.updateStatus({
        state: 'failed',
        message: 'Failed to verify SeedCode CLI installation.',
        error: msg
      });
    }

    return this.currentStatus;
  }

  /**
   * Starts the installation workflow.
   * Prompts the user for security confirmation, runs the script in the integrated terminal,
   * and polls until the CLI is operational.
   */
  public async install(): Promise<boolean> {
    const platform = PlatformDetector.getPlatformInfo();

    if (!platform.isSupported || !platform.installCommand) {
      vscode.window.showErrorMessage(
        `SeedCode CLI automated installation is not supported on ${platform.name}. Supported platforms: Windows and Linux.`
      );
      this.updateStatus({
        state: 'unsupported',
        platform,
        message: `Automated installation not supported on ${platform.name}.`
      });
      return false;
    }

    // Security confirmation prompt (Requirement 7 & 13)
    const confirmation = await vscode.window.showInformationMessage(
      `SeedCode CLI will be installed for ${platform.name} using the official installer:\n\n${platform.installCommand}\n\nDo you want to proceed?`,
      { modal: true },
      'Install SeedCode',
      'Cancel'
    );

    if (confirmation !== 'Install SeedCode') {
      logger.info('User cancelled SeedCode CLI installation.');
      return false;
    }

    this.updateStatus({
      state: 'installing',
      message: 'Installing SeedCode CLI... Check the integrated terminal for live progress.'
    });

    try {
      const terminalMgr = TerminalManager.getInstance();
      const { terminal } = terminalMgr.getOrCreateTerminal();
      terminal.show();

      logger.info(`Running installer command: ${platform.installCommand}`);
      terminal.sendText(platform.installCommand);

      vscode.window.showInformationMessage(
        'SeedCode CLI installation started in the Integrated Terminal. The extension will automatically verify and launch when ready.'
      );

      // Start verifying installation asynchronously
      this.monitorInstallation();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Failed to launch installation in terminal', err);
      this.updateStatus({
        state: 'failed',
        message: 'Failed to run installer in the Integrated Terminal.',
        error: msg
      });
      return false;
    }
  }

  /**
   * Periodically checks if the CLI has become available after running the installer.
   */
  private monitorInstallation(): void {
    if (this.isPolling) {
      return;
    }
    this.isPolling = true;

    let cancelled = false;
    this.pollCancellation = () => {
      cancelled = true;
    };

    const startTime = Date.now();
    const timeoutMs = 180000; // 3 minutes timeout
    const intervalMs = 3000;  // Poll every 3 seconds

    const poll = async () => {
      if (cancelled) {
        this.isPolling = false;
        return;
      }

      CliDetector.invalidateCache();
      const cliResult = await CliDetector.detect(true);

      if (cliResult.installed) {
        this.isPolling = false;
        this.pollCancellation = null;
        this.updateStatus({
          state: 'installed',
          cliResult,
          message: 'SeedCode CLI installed successfully!'
        });

        vscode.window.showInformationMessage(
          `SeedCode CLI installed successfully! (${cliResult.version || 'Ready'}) Launching CLI...`
        );

        // Automatically launch SeedCode CLI upon successful installation
        TerminalManager.getInstance().launchCli();
        return;
      }

      if (Date.now() - startTime > timeoutMs) {
        this.isPolling = false;
        this.pollCancellation = null;
        this.updateStatus({
          state: 'failed',
          message: 'Installation timed out. Please check the terminal output for details or try again.',
          error: 'Process exceeded timeout limit without detecting seedcode executable.'
        });
        vscode.window.showWarningMessage(
          'SeedCode CLI installation timed out. If the installation completed in terminal, click "Check Installation" or reopen the terminal.'
        );
        return;
      }

      // Schedule next poll
      setTimeout(poll, intervalMs);
    };

    // First check after 5 seconds to give installer time to start
    setTimeout(poll, 5000);
  }

  public cancelMonitoring(): void {
    if (this.pollCancellation) {
      this.pollCancellation();
      this.pollCancellation = null;
      this.isPolling = false;
    }
  }

  public dispose(): void {
    this.cancelMonitoring();
    this.onDidChangeStatusEmitter.dispose();
  }
}
