# SeedCode for Visual Studio Code

<p align="center">
  <img src="assets/logo.png" alt="SeedCode Logo" width="128" height="128" />
</p>

<p align="center">
  <strong>Your AI coding agent, built for the terminal. Plant ideas. Grow code.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#requirements">Requirements</a> •
  <a href="#supported-platforms">Supported Platforms</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#troubleshooting">Troubleshooting</a> •
  <a href="#development">Development</a>
</p>

---

## Overview

**SeedCode** integrates the powerful, terminal-based AI coding assistant directly into Visual Studio Code. Similar to modern developer workflows in OpenCode and Kilo Code, the SeedCode extension provides a dedicated Activity Bar container, intelligent CLI detection, automated installation workflows, and single-click access inside the VS Code Integrated Terminal.

Rather than locking your AI experience into an artificial or restricted chat box, SeedCode brings the full, uncompromised power of the native terminal agent directly into your editor—preserving ANSI formatting, interactive menus, real-time diffs, and your chosen AI provider configurations.

---

## Features

- 🌿 **Dedicated Activity Bar Integration**: A native icon in the VS Code Activity Bar with a clean, theme-aware sidebar interface.
- ⚡ **One-Click CLI Launch**: Spawns or focuses the interactive SeedCode terminal with a single click.
- 🛡️ **Intelligent Terminal Management**:
  - Automatically targets the active workspace or project folder.
  - Reuses existing active sessions without opening duplicate terminals.
  - Preserves full interactive input, ANSI colors, and keyboard shortcuts.
- 🔍 **Automated CLI Detection**:
  - Automatically identifies whether `seedcode` is installed and operational.
  - Detects PATH executables and well-known installation paths on Windows and Linux.
- 🚀 **Built-In CLI Installer**:
  - Detects your operating system automatically.
  - Securely prompts for confirmation before running official installation scripts.
  - Shows live installation progress in the integrated terminal.
  - Automatically verifies and launches the CLI once installation finishes.
- 🎨 **Adaptive Theme Support**: Designed from the ground up using official VS Code design tokens (`var(--vscode-*)`) to look seamless across Light, Dark, High Contrast, and custom themes.
- 🔄 **Quick Session Control**: Easily restart CLI sessions, recheck environment health, or view active logs through the Command Palette or View Header actions.

---

## Screenshots

<!-- SeedCode VS Code Interface Screenshot Placeholder -->
<p align="center">
  <img src="assets/logo.png" alt="SeedCode Preview" width="380" />
  <br />
  <em>SeedCode Activity Bar Sidebar & Integrated Terminal Session</em>
</p>

---

## Supported Platforms

| Platform | Support Status | Automated Installation Script |
| :--- | :---: | :--- |
| **Windows 10 / 11** | Supported | `irm https://seedcode-cli.vercel.app/install.ps1 \| iex` (PowerShell) |
| **Linux (Ubuntu, Debian, Fedora, Arch, etc.)** | Supported | `curl -fsSL https://seedcode-cli.vercel.app/install.sh \| bash` (Bash) |
| **macOS** | Manual CLI Setup | Manual terminal installation via SeedCode documentation |

---

## Requirements

- **Visual Studio Code**: `v1.80.0` or higher.
- **SeedCode CLI**: If not already present, you can install it with one click directly inside the extension sidebar.

---

## Installation

### Method 1: Install from VSIX (Recommended for Offline / Manual Setup)

1. Download the latest `seedcode-1.0.0.vsix` package.
2. In VS Code, open the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
3. Click the **`...`** (More Actions) menu in the top-right corner of the Extensions panel.
4. Select **Install from VSIX...**
5. Choose the downloaded `seedcode-1.0.0.vsix` file.
6. The SeedCode seedling icon will immediately appear in your Activity Bar!

Alternatively, install via terminal:
```bash
code --install-extension seedcode-1.0.0.vsix
```

---

## Usage

### 1. Launching SeedCode
1. Click the **SeedCode** seedling icon in the Activity Bar on the left side of VS Code.
2. If SeedCode CLI is installed:
   - Click **Launch SeedCode CLI** or press `Ctrl+Shift+P` → `SeedCode: Launch CLI`.
   - The Integrated Terminal named `SeedCode CLI` will open in your current project folder.
3. If SeedCode CLI is not installed:
   - The sidebar displays a welcome screen indicating the CLI is not yet installed.
   - Click **Install SeedCode** to start the guided installation.

### 2. Quick Terminal Commands
Inside the SeedCode CLI terminal, you can interact with your AI assistant using:
- `/help` — Display available commands and hotkeys.
- `/provider` — Select or configure AI providers (OpenAI, Anthropic, Gemini, Groq, Ollama, etc.).
- `/model` — Switch AI models on the fly.
- `/doctor` — Run environment and configuration diagnostics.
- `/settings` — Customize assistant behavior and permissions.

### 3. VS Code Command Palette Actions
Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type `SeedCode`:
- **`SeedCode: Open`**: Focuses the SeedCode Activity Bar view.
- **`SeedCode: Launch CLI`**: Starts or focuses the SeedCode CLI terminal session.
- **`SeedCode: Install CLI`**: Initiates the automated CLI installer for your platform.
- **`SeedCode: Check Installation`**: Forces a fresh scan for the SeedCode CLI binary.
- **`SeedCode: Restart CLI`**: Closes any existing SeedCode terminal and creates a fresh session.
- **`SeedCode: Open Terminal`**: Brings the active SeedCode terminal to the foreground.

---

## How Automatic CLI Installation Works

When you click **Install SeedCode**:
1. The extension detects your operating system (Windows or Linux).
2. It displays a secure confirmation prompt showing the exact command that will be executed.
3. Upon confirmation, a dedicated Integrated Terminal named `SeedCode CLI` opens and executes the official script:
   - **Windows**: Executes PowerShell download and installation pipeline.
   - **Linux**: Executes Bash curl installation pipeline.
4. The extension monitors the system for the appearance and operation of the `seedcode` executable.
5. Once verified, SeedCode launches automatically, ready for you to code!

---

## Troubleshooting

### `seedcode` command not found after installation (Windows)
On Windows, newly modified environment variables (such as `PATH`) might not immediately be visible to terminals that were opened before the installation completed.
- The extension automatically searches well-known installation directories (such as `C:\Program Files\SeedCode\seedcode.exe` or `%LOCALAPPDATA%\SeedCode\seedcode.exe`).
- If this occurs, click **Check Installation** in the SeedCode sidebar or run `SeedCode: Check Installation` from the Command Palette.
- You can also restart the terminal using `SeedCode: Restart CLI`.

### No workspace folder open
SeedCode works best when operating inside a project directory so it can read project files and generate code in context. If you launch SeedCode without an open folder, the extension prompts you to either open a workspace folder or proceed using your user home directory.

### Checking Extension Logs
If you encounter any issues, open the VS Code **Output** panel (`Ctrl+Shift+U` or `View → Output`) and select **SeedCode** from the drop-down menu to view diagnostic logs.

---

## Development & Building

To build the extension from source:

```bash
# Clone the repository
git clone https://github.com/Alshahriar-07/seedcode-vscode.git
cd seedcode-vscode

# Install dependencies
npm install

# Run automated tests
npm test

# Type-check TypeScript code
npm run typecheck

# Build bundle with esbuild
npm run build

# Package production VSIX
npx @vscode/vsce package --no-dependencies
```

---

## Credits & License

Created and maintained by **Al Shahriar Sowan**.

Released under the [MIT License](LICENSE).
