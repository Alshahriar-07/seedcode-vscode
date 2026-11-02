export interface MockTerminal {
  name: string;
  cwd?: string;
  shown: boolean;
  disposed: boolean;
  sentTexts: string[];
  show(): void;
  sendText(text: string): void;
  dispose(): void;
}

export const mockTerminals: MockTerminal[] = [];

export const workspace = {
  workspaceFolders: [
    {
      uri: { fsPath: process.cwd() },
      name: 'test-workspace',
      index: 0
    }
  ],
  getWorkspaceFolder: () => undefined
};

export const window = {
  activeTextEditor: undefined,
  terminals: mockTerminals,
  createTerminal: (options: { name: string; cwd?: string; iconPath?: any }) => {
    const term: MockTerminal = {
      name: options.name,
      cwd: options.cwd,
      shown: false,
      disposed: false,
      sentTexts: [],
      show: () => { term.shown = true; },
      sendText: (text: string) => { term.sentTexts.push(text); },
      dispose: () => {
        term.disposed = true;
        const idx = mockTerminals.indexOf(term);
        if (idx !== -1) mockTerminals.splice(idx, 1);
      }
    };
    mockTerminals.push(term);
    return term;
  },
  onDidCloseTerminal: () => ({ dispose: () => {} }),
  createOutputChannel: () => ({
    appendLine: () => {},
    show: () => {},
    dispose: () => {}
  }),
  showInformationMessage: async () => 'Install SeedCode',
  showWarningMessage: async () => undefined,
  showErrorMessage: async () => undefined
};

export const commands = {
  registerCommand: () => ({ dispose: () => {} }),
  executeCommand: async () => undefined
};

export class EventEmitter<T = any> {
  private listeners: ((e: T) => void)[] = [];
  public event = (listener: (e: T) => void) => {
    this.listeners.push(listener);
    return { dispose: () => {} };
  };
  public fire = (data: T) => {
    this.listeners.forEach(l => l(data));
  };
  public dispose = () => {};
}

export class ThemeIcon {
  constructor(public id: string) {}
}

export const Uri = {
  file: (path: string) => ({ fsPath: path }),
  parse: (uri: string) => ({ toString: () => uri }),
  joinPath: (base: any, ...parts: string[]) => ({ fsPath: parts.join('/') })
};
