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

export interface MockWebview {
  options: any;
  html: string;
  posted: any[];
  messageHandler?: (message: any) => void;
  asWebviewUri(uri: any): string;
  postMessage(message: any): Promise<boolean>;
  onDidReceiveMessage(cb: (message: any) => void): { dispose: () => void };
}

export function createMockWebview(): MockWebview {
  const webview: MockWebview = {
    options: {},
    html: '',
    posted: [],
    asWebviewUri: (uri: any) => `vscode-resource://${uri?.fsPath ?? 'resource'}`,
    postMessage: async (message: any) => {
      webview.posted.push(message);
      return true;
    },
    onDidReceiveMessage: (cb: (message: any) => void) => {
      webview.messageHandler = cb;
      return { dispose: () => {} };
    }
  };
  return webview;
}

export const mockPanels: any[] = [];

export const ViewColumn = {
  Active: -1,
  Beside: -2,
  One: 1
};

export const window = {
  activeTextEditor: undefined,
  terminals: mockTerminals,
  createWebviewPanel: (viewType: string, title: string, _column?: any, _options?: any) => {
    const webview = createMockWebview();
    const panel: any = {
      viewType,
      title,
      webview,
      iconPath: undefined,
      revealed: 0,
      disposed: false,
      onDidDispose: (cb: () => void) => {
        panel.disposeHandler = cb;
        return { dispose: () => {} };
      },
      reveal: () => {
        panel.revealed += 1;
      },
      dispose: () => {
        if (panel.disposed) {
          return;
        }
        panel.disposed = true;
        if (panel.disposeHandler) {
          panel.disposeHandler();
        }
        const idx = mockPanels.indexOf(panel);
        if (idx !== -1) {
          mockPanels.splice(idx, 1);
        }
      }
    };
    mockPanels.push(panel);
    return panel;
  },
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

export const env = {
  openExternal: async () => true
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
