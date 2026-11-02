# Changelog

All notable changes to the **SeedCode** extension will be documented in this file.

## [1.0.0] - 2026-11-02

### Added
- **Activity Bar Integration**: Dedicated SeedCode view container with custom pixel-art vector seedling icon.
- **Native Integrated Terminal Support**: Single-click launch of `seedcode` in VS Code's Integrated Terminal named `SeedCode CLI`.
- **Automatic CLI Detection**: Detects SeedCode CLI via system PATH, `where.exe`/`which`, and standard installation paths across Windows and Linux.
- **One-Click Automated CLI Installation**:
  - Windows: Automated installation using official PowerShell script (`irm https://seedcode-cli.vercel.app/install.ps1 | iex`).
  - Linux: Automated installation using official Bash script (`curl -fsSL https://seedcode-cli.vercel.app/install.sh | bash`).
  - Interactive terminal output and automatic status polling.
- **Terminal Management**:
  - Terminal reuse logic to prevent duplicate sessions.
  - Automatic workspace root detection and folder binding.
  - CLI session restart command (`SeedCode: Restart CLI`).
- **Polished Sidebar Interface**:
  - Theme-adaptive Webview supporting all VS Code themes.
  - Clear multi-state UX: Checking, Not Installed, Installing, Ready, and Failed.
  - Quick command hints for `/help`, `/provider`, `/model`, and `/doctor`.
- **VS Code Commands**:
  - `SeedCode: Open`
  - `SeedCode: Launch CLI`
  - `SeedCode: Install CLI`
  - `SeedCode: Check Installation`
  - `SeedCode: Restart CLI`
  - `SeedCode: Open Terminal`
- **Security & Integrity**: Explicit user confirmation before executing remote installation scripts; strictly respects workspace boundaries.
