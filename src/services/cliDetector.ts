import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as process from 'process';
import { logger } from '../utils/logger';
import { PlatformDetector } from './platformDetector';
import { PathResolver } from '../utils/paths';

export interface CliDetectionResult {
  installed: boolean;
  executablePath?: string;
  version?: string;
  error?: string;
}

export class CliDetector {
  private static cachedResult: CliDetectionResult | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_TTL_MS = 5000; // 5 seconds cache

  /**
   * Standard well-known installation locations for SeedCode CLI across OSes.
   */
  private static getWellKnownPaths(): string[] {
    const home = os.homedir();
    if (PlatformDetector.isWindows()) {
      const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
      const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
      const localAppData = process.env['LOCALAPPDATA'] || path.join(home, 'AppData', 'Local');
      const appData = process.env['APPDATA'] || path.join(home, 'AppData', 'Roaming');

      return [
        path.join(programFiles, 'SeedCode', 'seedcode.exe'),
        path.join(programFilesX86, 'SeedCode', 'seedcode.exe'),
        path.join(localAppData, 'Programs', 'SeedCode', 'seedcode.exe'),
        path.join(localAppData, 'SeedCode', 'seedcode.exe'),
        path.join(appData, 'SeedCode', 'seedcode.exe'),
        path.join(home, '.local', 'bin', 'seedcode.exe'),
        path.join(home, '.seedcode', 'bin', 'seedcode.exe')
      ];
    } else {
      return [
        '/usr/local/bin/seedcode',
        '/usr/bin/seedcode',
        PathResolver.expandHome('~/.local/bin/seedcode'),
        PathResolver.expandHome('~/.seedcode/bin/seedcode'),
        PathResolver.expandHome('~/bin/seedcode')
      ];
    }
  }

  /**
   * Checks whether SeedCode CLI is installed and operational.
   */
  public static async detect(forceRefresh = false): Promise<CliDetectionResult> {
    const now = Date.now();
    if (!forceRefresh && this.cachedResult && now - this.cacheTimestamp < this.CACHE_TTL_MS) {
      return this.cachedResult;
    }

    logger.info('Detecting SeedCode CLI installation...');

    // Step 1: Check PATH via system command locator
    const pathExecutable = await this.findInPath();

    let candidatePath = pathExecutable;

    // Step 2: If not found in current process PATH, check well-known file locations
    if (!candidatePath) {
      const wellKnown = this.findInWellKnownLocations();
      if (wellKnown) {
        logger.info(`Found SeedCode CLI in well-known path: ${wellKnown}`);
        candidatePath = wellKnown;
        // Ensure its directory is added to process.env.PATH so subsequent child processes see it
        const dir = path.dirname(wellKnown);
        if (process.env.PATH && !process.env.PATH.includes(dir)) {
          process.env.PATH = `${dir}${path.delimiter}${process.env.PATH}`;
        }
      }
    }

    if (!candidatePath) {
      const result: CliDetectionResult = {
        installed: false,
        error: 'SeedCode CLI executable not found in PATH or standard locations.'
      };
      this.cachedResult = result;
      this.cacheTimestamp = now;
      logger.info('SeedCode CLI not found.');
      return result;
    }

    // Step 3: Verify the executable works and get its version
    const versionResult = await this.queryVersion(candidatePath);
    if (!versionResult.success) {
      logger.warn(`SeedCode CLI found at ${candidatePath} but failed to execute: ${versionResult.error}`);
      const result: CliDetectionResult = {
        installed: false,
        executablePath: candidatePath,
        error: `CLI found at ${candidatePath} but execution failed: ${versionResult.error}`
      };
      this.cachedResult = result;
      this.cacheTimestamp = now;
      return result;
    }

    const result: CliDetectionResult = {
      installed: true,
      executablePath: candidatePath,
      version: versionResult.version
    };

    logger.info(`SeedCode CLI detected successfully: ${candidatePath} (${versionResult.version || 'unknown version'})`);
    this.cachedResult = result;
    this.cacheTimestamp = now;
    return result;
  }

  /**
   * Locates `seedcode` command in PATH using OS-specific locator.
   */
  private static async findInPath(): Promise<string | undefined> {
    const isWin = PlatformDetector.isWindows();
    const cmd = isWin ? 'where.exe' : 'which';
    const arg = isWin ? 'seedcode' : 'seedcode';

    return new Promise((resolve) => {
      execFile(cmd, [arg], { timeout: 3000 }, (error, stdout) => {
        if (error || !stdout) {
          resolve(undefined);
          return;
        }

        const lines = stdout.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length > 0) {
          // On Windows, where.exe might return multiple lines, pick the first valid one
          resolve(lines[0]);
        } else {
          resolve(undefined);
        }
      });
    });
  }

  /**
   * Checks well-known file paths directly.
   */
  private static findInWellKnownLocations(): string | undefined {
    const candidates = this.getWellKnownPaths();
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          return p;
        }
      } catch {
        // Ignore file access errors
      }
    }
    return undefined;
  }

  /**
   * Queries `seedcode --version` to verify functionality.
   */
  private static async queryVersion(executablePath: string): Promise<{ success: boolean; version?: string; error?: string }> {
    return new Promise((resolve) => {
      execFile(executablePath, ['--version'], { timeout: 5000 }, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, error: error.message || stderr });
          return;
        }

        const output = (stdout || stderr).trim();
        resolve({ success: true, version: output });
      });
    });
  }

  /**
   * Invalidate cached detection.
   */
  public static invalidateCache(): void {
    this.cachedResult = null;
    this.cacheTimestamp = 0;
  }
}
