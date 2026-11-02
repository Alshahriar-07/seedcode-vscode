import * as os from 'os';
import * as process from 'process';

export type SupportedPlatform = 'windows' | 'linux';
export type PlatformType = SupportedPlatform | 'darwin' | 'other';

export interface PlatformInfo {
  type: PlatformType;
  isSupported: boolean;
  name: string;
  installCommand?: string;
  shellExecutable?: string;
}

export class PlatformDetector {
  /**
   * Identifies the current operating system and its capabilities.
   */
  public static getPlatformInfo(): PlatformInfo {
    const platform = process.platform;

    if (platform === 'win32') {
      return {
        type: 'windows',
        isSupported: true,
        name: 'Windows',
        installCommand: 'irm https://seedcode-cli.vercel.app/install.ps1 | iex',
        shellExecutable: process.env.COMSPEC ? undefined : 'powershell.exe'
      };
    }

    if (platform === 'linux') {
      return {
        type: 'linux',
        isSupported: true,
        name: 'Linux',
        installCommand: 'curl -fsSL https://seedcode-cli.vercel.app/install.sh | bash',
        shellExecutable: process.env.SHELL || '/bin/bash'
      };
    }

    if (platform === 'darwin') {
      return {
        type: 'darwin',
        isSupported: false,
        name: 'macOS'
      };
    }

    return {
      type: 'other',
      isSupported: false,
      name: os.type() || 'Unknown'
    };
  }

  public static isWindows(): boolean {
    return process.platform === 'win32';
  }

  public static isLinux(): boolean {
    return process.platform === 'linux';
  }

  public static isSupported(): boolean {
    return this.isWindows() || this.isLinux();
  }
}
