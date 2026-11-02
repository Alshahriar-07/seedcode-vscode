# SeedCode CLI

A VS Code extension for [SeedCode CLI](https://github.com/Alshahriar-07/seedcode-cli), a terminal-based AI coding agent. It runs the CLI binary you already have in a pseudo-terminal and renders it with xterm.js, so you can use the agent without switching to an external terminal window.

The interface has two hosts:

- a SeedCode CLI icon in the Activity Bar that opens the sidebar;
- a `SeedCode CLI: Open in Editor Tab` command that opens the same interface as an editor tab.

Both hosts render the same markup and talk to the same PTY session, so the CLI starts once and the second surface attaches to the running session.

## Screenshots

No screenshots are committed to this repository yet. The Activity Bar sidebar and the editor tab look the same apart from the surrounding VS Code chrome.

## Features

- **Dedicated Activity Bar sidebar.** The extension contributes its own `seedcode` view container, so the icon sits next to Explorer, Search, Source Control, Run and Debug, and Extensions. It is not added to the Explorer view.
- **Open in Editor Tab.** `SeedCode CLI: Open in Editor Tab` (command id `seedcode.openInEditor`) creates a webview panel in the editor area titled `SeedCode CLI`, with the SeedCode logo as the tab icon. Running the command again reveals the existing tab instead of opening a second one. The action uses the original colored SeedCode logo with its background (`assets/seedcode-colored-with-bg.svg`), which is readable on both light and dark themes. The Activity Bar icon stays monochrome (`assets/seedcode.svg`) because VS Code expects theme-adaptive icons there. The same action is also available from the sidebar title bar, from the icon button in the sidebar toolbar, and from the SeedCode CLI icon in the editor title toolbar.
- **SeedCode CLI integration.** The extension does not reimplement the agent. It executes the installed `seedcode` executable inside a PTY, so prompts, keyboard shortcuts and slash commands behave as they do in a normal terminal.
- **CLI installation and detection.** On startup the extension checks for the executable. If it is missing, the sidebar and editor tab show a setup screen with a one-click installer for Windows and Linux. A recheck command is available when the executable is installed later.
- **Workspace-based execution.** The CLI runs in the active workspace folder, or in the folder of the active editor when several folders are open. Without a workspace it runs in the user's home directory.

## Requirements

- Visual Studio Code 1.80 or newer.
- SeedCode CLI. If it is not installed, use the setup screen or one of the install commands:
  - Windows: `irm https://seedcode-cli.vercel.app/install.ps1 | iex`
  - Linux: `curl -fsSL https://seedcode-cli.vercel.app/install.sh | bash`
  - macOS: install the CLI manually and make sure it is on `PATH`.
- The extension bundles `node-pty`, which is a native module. A VS Code version that matches your platform is enough for normal use; for development from source see the build section.

## Installation

### From a VSIX file

1. Open the Extensions view (`Ctrl+Shift+X`).
2. Open the `...` menu and choose **Install from VSIX...**.
3. Select `seedcode-vscode-2.1.4.vsix`.
4. The SeedCode CLI icon appears in the Activity Bar.

From a terminal:

```bash
code --install-extension seedcode-vscode-2.1.4.vsix
```

Reload the window if the icon does not appear immediately after installing.

## Getting Started

1. Click the SeedCode CLI icon in the Activity Bar. The sidebar opens.
2. If the CLI is not installed, the sidebar shows an installer card. The installer asks for confirmation before running the script and detects the CLI once it finishes.
3. When the CLI is detected, the terminal attaches automatically. Type your prompt or a slash command such as `/help`, `/provider`, `/model` or `/doctor`.
4. Use the toolbar for the session actions:
   - The SeedCode icon button opens the same interface as an editor tab.
   - **Clear** clears the terminal buffer.
   - **Restart** stops the current CLI process and starts a new one.
5. To open the interface from the editor title toolbar, click the SeedCode CLI icon that sits with the other editor actions while any file is open.
6. To close the editor tab, close it like any other tab. The sidebar keeps working; run the command again to reopen the tab.

## Available Commands

All commands are in the `SeedCode CLI` category in the Command Palette.

| Command ID | Palette title | What it does |
| --- | --- | --- |
| `seedcode.open` | SeedCode CLI: Open in Sidebar | Focuses the SeedCode CLI sidebar. |
| `seedcode.openInEditor` | SeedCode CLI: Open in Editor Tab | Opens or reveals the SeedCode CLI editor tab. |
| `seedcode.launch` | SeedCode CLI: Launch CLI | Focuses the sidebar and starts the CLI if it is not running. |
| `seedcode.install` | SeedCode CLI: Install CLI | Runs the official installer, after a confirmation prompt. |
| `seedcode.checkInstallation` | SeedCode CLI: Check Installation | Re-scans the system for the CLI and reports the result. |
| `seedcode.restart` | SeedCode CLI: Restart CLI | Restarts the CLI process. |
| `seedcode.openTerminal` | SeedCode CLI: Focus Sidebar | Focuses the sidebar, same as `seedcode.open`. |

`seedcode.open`, `seedcode.launch`, `seedcode.openTerminal` and `seedcode.restart` focus the sidebar view. The editor tab is opened explicitly with `seedcode.openInEditor`.

## Configuration

The extension does not contribute any settings yet. Everything that can be configured, including providers, models and API keys, stays in the CLI's own configuration files and is not touched by the extension.

## Development and Build Instructions

```bash
# install dependencies
npm install

# type-check the extension sources
npm run typecheck

# run the test suite (bundles test/runTests.ts with esbuild and executes it)
npm test

# development bundle with sourcemaps
npm run build

# production bundle
npm run package
```

Layout:

- `src/extension.ts` – activation, provider registration, command registration.
- `src/providers/seedcodeViewProvider.ts` – Activity Bar webview view host.
- `src/providers/seedcodeEditorPanel.ts` – editor tab webview panel host.
- `src/providers/seedCodeWebviewHost.ts` – shared message handling, PTY forwarding and rendering used by both hosts.
- `src/providers/seedCodeWebviewContent.ts` – the HTML/CSS for the terminal and setup screens.
- `src/services/` – CLI detection, installation, platform detection, PTY session and legacy terminal helpers.
- `src/commands/` – one file per command.
- `media/` – xterm.js, the fit addon and `terminal.js`, which wires the webview to the extension.
- `test/` – the test suite and a small `vscode` mock used by it.

The tests run outside VS Code against the bundled sources and the local machine, including a check that the CLI is detected and can be spawned. They assert the manifest contributions (Activity Bar container, view IDs, commands, menu entries), the webview panel behaviour and the shared UI markup.

To debug, open the repository in VS Code and press `F5`. The Extension Development Host loads the extension from `dist/extension.js`, so run `npm run build` first (or `npm run watch` while editing).

### Releasing

1. Update `version` in `package.json` and add a matching entry to `CHANGELOG.md`.
2. Run `npm run typecheck && npm test`.
3. Run `npm run vscode:package`. This validates the manifest and writes `seedcode-vscode-<version>.vsix`.
4. Check the package contents:
   ```bash
   unzip -l seedcode-vscode-2.1.4.vsix | grep -E "seedcode.svg|extension.js"
   unzip -p seedcode-vscode-2.1.4.vsix extension/package.json | grep -A4 viewsContainers
   ```

## Known Limitations

- The automated installer covers Windows and Linux. On macOS the CLI has to be installed manually.
- The sidebar and the editor tab share one CLI process. Opening the second surface replays the current buffer and attaches to the same session; it does not start an independent session.
- Only one editor tab is used. Running `Open in Editor Tab` while the tab is open reveals it.
- Terminal size follows the surface that most recently reported a resize.
- With multiple workspace folders, the CLI runs in the folder of the active editor, otherwise the first folder.
- The extension does not expose settings and does not manage CLI configuration or credentials.
- The webview does not forward every VS Code keybinding; shortcuts are handled by the CLI once the terminal has focus.

## Author

Al Shahriar Sowan

- Repository: https://github.com/Alshahriar-07/seedcode-vscode
- CLI: https://github.com/Alshahriar-07/seedcode-cli

## License

MIT. See [LICENSE](LICENSE).
