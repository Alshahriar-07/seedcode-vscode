import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import { PathResolver } from '../utils/paths';

export class TerminalManager {
  private static instance: TerminalManager;
  private currentTerminal: vscode.Terminal | null = null;
  private disposables: vscode.Disposable[] = [];

  public static readonly TERMINAL_NAME = 'SeedCode CLI';

  private constructor() {
    this.registerListeners();
  }

  public static getInstance(): TerminalManager {
    if (!TerminalManager.instance) {
      TerminalManager.instance = new TerminalManager();
    }
    return TerminalManager.instance;
  }

  private registerListeners(): void {
    const closeListener = vscode.window.onDidCloseTerminal((closedTerminal) => {
      if (this.currentTerminal && this.currentTerminal === closedTerminal) {
        logger.info(`SeedCode terminal was closed by user or process.`);
        this.currentTerminal = null;
      }
    });
    this.disposables.push(closeListener);
  }

  /**
   * Finds an existing SeedCode terminal if one is already open in VS Code.
   */
  public findExistingTerminal(): vscode.Terminal | undefined {
    // If our reference is alive in vscode.window.terminals, use it
    if (this.currentTerminal) {
      const isAlive = vscode.window.terminals.some(t => t === this.currentTerminal);
      if (isAlive) {
        return this.currentTerminal;
      }
      this.currentTerminal = null;
    }

    // Otherwise check if any active terminal has our designated name
    const found = vscode.window.terminals.find(t => t.name === TerminalManager.TERMINAL_NAME);
    if (found) {
      this.currentTerminal = found;
      return found;
    }

    return undefined;
  }

  /**
   * Retrieves existing terminal or creates a new one in the appropriate working directory.
   */
  public getOrCreateTerminal(cwd?: string): { terminal: vscode.Terminal; isNew: boolean } {
    const existing = this.findExistingTerminal();
    if (existing) {
      logger.info('Reusing existing SeedCode terminal.');
      return { terminal: existing, isNew: false };
    }

    const effectiveCwd = cwd || PathResolver.getEffectiveWorkingDirectory().cwd;
    logger.info(`Creating new SeedCode terminal with cwd: ${effectiveCwd}`);

    const terminalOptions: vscode.TerminalOptions = {
      name: TerminalManager.TERMINAL_NAME,
      cwd: effectiveCwd,
      iconPath: new vscode.ThemeIcon('terminal')
    };

    const newTerminal = vscode.window.createTerminal(terminalOptions);
    this.currentTerminal = newTerminal;
    return { terminal: newTerminal, isNew: true };
  }

  /**
   * Launches SeedCode CLI inside the integrated terminal.
   * If terminal is already running, brings it to focus.
   * If not, creates terminal and executes `seedcode`.
   */
  public launchCli(cwd?: string, command: string = 'seedcode'): vscode.Terminal {
    const { terminal, isNew } = this.getOrCreateTerminal(cwd);

    terminal.show();

    if (isNew) {
      logger.info(`Sending command to terminal: ${command}`);
      terminal.sendText(command);
    } else {
      logger.info('SeedCode terminal already active. Focused terminal.');
    }

    return terminal;
  }

  /**
   * Restarts SeedCode CLI by closing any existing terminal and spawning a fresh one.
   */
  public restartCli(cwd?: string, command: string = 'seedcode'): vscode.Terminal {
    const existing = this.findExistingTerminal();
    if (existing) {
      logger.info('Closing existing terminal for restart.');
      existing.dispose();
      this.currentTerminal = null;
    }

    const { terminal } = this.getOrCreateTerminal(cwd);
    terminal.show();
    logger.info(`Restarting SeedCode CLI: ${command}`);
    terminal.sendText(command);
    return terminal;
  }

  /**
   * Shows and focuses the terminal without sending new commands.
   */
  public focusTerminal(): void {
    const existing = this.findExistingTerminal();
    if (existing) {
      existing.show();
    } else {
      this.launchCli();
    }
  }

  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.currentTerminal = null;
  }
}
