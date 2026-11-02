(function () {
  // Acquire VS Code API
  const vscode = acquireVsCodeApi();

  function getThemeColors() {
    const style = getComputedStyle(document.documentElement);
    const getVar = (name, fallback) => {
      const val = style.getPropertyValue(name).trim();
      return val || fallback;
    };

    return {
      background: getVar('--vscode-terminal-background', getVar('--vscode-sideBar-background', '#181818')),
      foreground: getVar('--vscode-terminal-foreground', getVar('--vscode-sideBar-foreground', '#cccccc')),
      cursor: getVar('--vscode-terminalCursor-foreground', '#7bed9f'),
      cursorAccent: getVar('--vscode-terminalCursor-background', '#000000'),
      selectionBackground: getVar('--vscode-terminal-selectionBackground', 'rgba(123, 237, 159, 0.3)'),
      black: getVar('--vscode-terminal-ansiBlack', '#000000'),
      red: getVar('--vscode-terminal-ansiRed', '#cd3131'),
      green: getVar('--vscode-terminal-ansiGreen', '#2ecc71'),
      yellow: getVar('--vscode-terminal-ansiYellow', '#e5e510'),
      blue: getVar('--vscode-terminal-ansiBlue', '#2472c8'),
      magenta: getVar('--vscode-terminal-ansiMagenta', '#bc3fbc'),
      cyan: getVar('--vscode-terminal-ansiCyan', '#11a8cd'),
      white: getVar('--vscode-terminal-ansiWhite', '#e5e5e5'),
      brightBlack: getVar('--vscode-terminal-ansiBrightBlack', '#666666'),
      brightRed: getVar('--vscode-terminal-ansiBrightRed', '#f14c4c'),
      brightGreen: getVar('--vscode-terminal-ansiBrightGreen', '#7bed9f'),
      brightYellow: getVar('--vscode-terminal-ansiBrightYellow', '#f5f543'),
      brightBlue: getVar('--vscode-terminal-ansiBrightBlue', '#3b8eea'),
      brightMagenta: getVar('--vscode-terminal-ansiBrightMagenta', '#d670d6'),
      brightCyan: getVar('--vscode-terminal-ansiBrightCyan', '#29b8db'),
      brightWhite: getVar('--vscode-terminal-ansiBrightWhite', '#ffffff')
    };
  }

  const container = document.getElementById('terminal-container');
  if (!container) {
    return;
  }

  // Initialize xterm.js
  const term = new Terminal({
    cursorBlink: true,
    cursorStyle: 'block',
    fontSize: 12.5,
    fontFamily: 'Consolas, "Courier New", Courier, monospace',
    lineHeight: 1.25,
    theme: getThemeColors(),
    allowTransparency: true,
    scrollback: 5000,
    convertEol: true
  });

  // Fit addon for automatic dimension adjustment
  const fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);

  term.open(container);

  function fitTerminal() {
    try {
      fitAddon.fit();
      if (term.cols && term.rows) {
        vscode.postMessage({
          type: 'resize',
          cols: term.cols,
          rows: term.rows
        });
      }
    } catch (e) {
      // fit error during hide/show
    }
  }

  // Initial fit
  setTimeout(fitTerminal, 50);

  // Resize observer to handle sidebar resizing smoothly
  const resizeObserver = new ResizeObserver(() => {
    fitTerminal();
  });
  resizeObserver.observe(container);

  window.addEventListener('resize', () => {
    fitTerminal();
  });

  // Forward user keyboard input to PTY
  term.onData((data) => {
    vscode.postMessage({
      type: 'input',
      data: data
    });
  });

  // Handle incoming messages from extension host
  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.type) {
      case 'output':
        term.write(message.data);
        break;
      case 'clear':
        term.clear();
        break;
      case 'focus':
        term.focus();
        break;
      case 'reset':
        term.reset();
        break;
      case 'update-theme':
        term.options.theme = getThemeColors();
        break;
    }
  });

  // Top bar buttons
  const btnRestart = document.getElementById('btn-term-restart');
  if (btnRestart) {
    btnRestart.addEventListener('click', () => {
      vscode.postMessage({ type: 'restart' });
    });
  }

  const btnClear = document.getElementById('btn-term-clear');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      term.clear();
      vscode.postMessage({ type: 'clear' });
    });
  }

  // Open the same interface in an editor tab
  const btnOpenEditor = document.getElementById('btn-open-editor');
  if (btnOpenEditor) {
    btnOpenEditor.addEventListener('click', () => {
      vscode.postMessage({ type: 'openInEditor' });
    });
  }

  // Notify extension that terminal is mounted and ready
  vscode.postMessage({
    type: 'ready',
    cols: term.cols || 80,
    rows: term.rows || 30
  });

  // Focus terminal automatically
  term.focus();
})();
