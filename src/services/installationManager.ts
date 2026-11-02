import * as vscode from 'vscode';
import * as process from 'process';
import { spawn } from 'child_process';
import { PlatformDetector, PlatformInfo } from './platformDetector';
import { CliDetector, CliDetectionResult } from './cliDetector';
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
      message: platform.isSupported
        ? 'Checking SeedCode CLI installation...'
        : `Operating system ${platform.name} is currently not supported for automated CLI installation.`
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
          message: `SeedCode CLI is ready (${cliResult.version || 'Version detected'}).`,
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
   * Runs the installation workflow directly inside the right sidebar environment.
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

    // Security confirmation prompt
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
      message: 'Installing SeedCode CLI... Please wait while the installer configures your environment.'
    });

    try {
      const isWin = PlatformDetector.isWindows();
      const shell = isWin ? 'powershell.exe' : 'bash';
      const shellArgs = isWin
        ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', platform.installCommand]
        : ['-c', platform.installCommand];

      logger.info(`Running installer: ${shell} ${shellArgs.join(' ')}`);

      const child = spawn(shell, shellArgs, {
        windowsHide: true,
        env: process.env
      });

      child.stdout.on('data', (chunk) => {
        logger.info(`[Installer]: ${chunk.toString().trim()}`);
      });

      child.stderr.on('data', (chunk) => {
        logger.warn(`[Installer Warning]: ${chunk.toString().trim()}`);
      });

      child.on('error', (err) => {
        logger.error('Installer execution error', err);
        this.updateStatus({
          state: 'failed',
          message: 'Failed to start installation process.',
          error: err.message
        });
      });

      child.on('close', async (code) => {
        logger.info(`Installer process completed with exit code: ${code}`);
        if (code === 0) {
          // Re-verify CLI presence
          CliDetector.invalidateCache();
          const cliResult = await CliDetector.detect(true);

          if (cliResult.installed) {
            this.updateStatus({
              state: 'installed',
              cliResult,
              message: 'SeedCode CLI installed successfully!'
            });
            vscode.window.showInformationMessage('SeedCode CLI installed successfully! Initializing terminal...');
          } else {
            // Give system time for PATH propagation
            this.monitorInstallation();
          }
        } else {
          this.updateStatus({
            state: 'failed',
            message: `Installation script exited with code ${code}. Check SeedCode extension output logs for details.`,
            error: `Process exit code: ${code}`
          });
        }
      });

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Failed to run installer', err);
      this.updateStatus({
        state: 'failed',
        message: 'Failed to launch installer.',
        error: msg
      });
      return false;
    }
  }

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
    const timeoutMs = 90000; // 90 seconds
    const intervalMs = 3000;

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
        vscode.window.showInformationMessage('SeedCode CLI detected! Initializing embedded terminal...');
        return;
      }

      if (Date.now() - startTime > timeoutMs) {
        this.isPolling = false;
        this.pollCancellation = null;
        this.updateStatus({
          state: 'failed',
          message: 'Installation verification timed out. Click "Recheck Status" or restart VS Code.',
          error: 'Verification timeout limit reached without detecting seedcode executable.'
        });
        return;
      }

      setTimeout(poll, intervalMs);
    };

    setTimeout(poll, 3000);
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
