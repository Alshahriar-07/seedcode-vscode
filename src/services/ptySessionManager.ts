import * as process from 'process';
import * as path from 'path';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface PtyOptions {
  executable: string;
  args?: string[];
  cwd?: string;
  cols?: number;
  rows?: number;
  env?: { [key: string]: string };
}

export class PtySessionManager {
  private static instance: PtySessionManager;
  private ptyProcess: any = null;
  private isAlive = false;
  private eventEmitter = new EventEmitter();

  // Replay buffer for when webview is hidden or re-rendered
  private buffer: string[] = [];
  private readonly MAX_BUFFER_CHUNKS = 500;

  private constructor() {}

  public static getInstance(): PtySessionManager {
    if (!PtySessionManager.instance) {
      PtySessionManager.instance = new PtySessionManager();
    }
    return PtySessionManager.instance;
  }

  public get running(): boolean {
    return this.isAlive && this.ptyProcess !== null;
  }

  /**
   * Retrieves the PTY module dynamically.
   */
  private getPtyModule(): any {
    try {
      // Dynamic require ensures extension host loads native binary
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('node-pty');
    } catch (err) {
      logger.error('Failed to load node-pty native module', err);
      throw new Error(
        `Native terminal emulator (node-pty) could not be loaded: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Spawns the CLI inside an embedded PTY.
   */
  public start(options: PtyOptions): boolean {
    if (this.running) {
      logger.info('PTY process is already active. Ignoring start request.');
      return true;
    }

    const pty = this.getPtyModule();
    const cols = options.cols || 80;
    const rows = options.rows || 30;
    const cwd = options.cwd || process.cwd();
    const args = options.args || [];

    logger.info(`Starting PTY session for: ${options.executable} (args: ${JSON.stringify(args)}, cwd: ${cwd})`);

    const env: { [key: string]: string } = {
      ...(process.env as { [key: string]: string }),
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      FORCE_COLOR: '3',
      PYTHONUNBUFFERED: '1',
      PYTHONIOENCODING: 'utf-8',
      ...options.env
    };

    // Ensure executable directory is present in PATH
    const execDir = path.dirname(options.executable);
    if (execDir && env.PATH && !env.PATH.includes(execDir)) {
      env.PATH = `${execDir}${path.delimiter}${env.PATH}`;
    }

    try {
      this.ptyProcess = pty.spawn(options.executable, args, {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env
      });

      this.isAlive = true;
      this.buffer = [];

      this.ptyProcess.onData((data: string) => {
        this.buffer.push(data);
        if (this.buffer.length > this.MAX_BUFFER_CHUNKS) {
          this.buffer.shift();
        }
        this.eventEmitter.emit('data', data);
      });

      this.ptyProcess.onExit((exitStatus: { exitCode: number; signal?: number }) => {
        logger.info(`PTY process exited with code: ${exitStatus.exitCode}, signal: ${exitStatus.signal}`);
        this.isAlive = false;
        this.ptyProcess = null;
        this.eventEmitter.emit('exit', exitStatus);
      });

      logger.info('PTY process spawned successfully.');
      return true;
    } catch (err) {
      this.isAlive = false;
      this.ptyProcess = null;
      logger.error('Error spawning PTY process', err);
      this.eventEmitter.emit('error', err);
      throw err;
    }
  }

  /**
   * Writes data from webview xterm into PTY stdin.
   */
  public write(data: string): void {
    if (this.running && this.ptyProcess) {
      try {
        this.ptyProcess.write(data);
      } catch (err) {
        logger.error('Error writing to PTY process', err);
      }
    }
  }

  /**
   * Resizes the PTY terminal window dimensions.
   */
  public resize(cols: number, rows: number): void {
    if (this.running && this.ptyProcess) {
      if (cols > 0 && rows > 0) {
        try {
          this.ptyProcess.resize(cols, rows);
        } catch {
          // Ignore resize errors if process is transitioning
        }
      }
    }
  }

  /**
   * Restarts the PTY session.
   */
  public restart(options: PtyOptions): boolean {
    this.kill();
    return this.start(options);
  }

  /**
   * Terminates active PTY process.
   */
  public kill(): void {
    if (this.ptyProcess) {
      try {
        logger.info('Terminating active PTY process.');
        this.ptyProcess.kill();
      } catch (err) {
        logger.warn(`Error while killing PTY process: ${err}`);
      }
      this.ptyProcess = null;
    }
    this.isAlive = false;
    this.buffer = [];
  }

  /**
   * Returns current buffer content for re-syncing when a webview is opened.
   */
  public getBuffer(): string {
    return this.buffer.join('');
  }

  public onData(listener: (data: string) => void): () => void {
    this.eventEmitter.on('data', listener);
    return () => this.eventEmitter.off('data', listener);
  }

  public onExit(listener: (status: { exitCode: number; signal?: number }) => void): () => void {
    this.eventEmitter.on('exit', listener);
    return () => this.eventEmitter.off('exit', listener);
  }

  public onError(listener: (err: any) => void): () => void {
    this.eventEmitter.on('error', listener);
    return () => this.eventEmitter.off('error', listener);
  }

  public dispose(): void {
    this.kill();
    this.eventEmitter.removeAllListeners();
  }
}
