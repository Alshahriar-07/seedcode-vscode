# Changelog

All notable changes to the **SeedCode CLI** extension will be documented in this file.

## [2.1.4] - 2026-11-02

### Changed — Colored-with-background logo for Open in Editor Tab

- `Open in Editor Tab` now uses the supplied `assets/seedcode-colored-with-bg.svg` everywhere it appears:
  the `view/title` and `editor/title` menu variants, the sidebar toolbar button (`<img>` inside the
  webview) and the editor tab `iconPath`.
- The asset is used as-is: no recolouring, no geometry changes, original colours, background and
  proportions kept.
- The Activity Bar container icon remains the monochrome `assets/seedcode.svg`, as VS Code requires
  theme-adaptive icons there.
- Tests assert the new asset for the command icon, the webview button and the panel `iconPath`, and
  that the packaged asset still contains its original colours.

## [2.1.3] - 2026-11-02

### Fixed — Colored SeedCode icon for Open in Editor Tab

- The `Open in Editor Tab` action now uses the original colored artwork instead of a monochrome
  glyph: `assets/seedcode-color.svg` for both `view/title` and `editor/title` menu variants, and the
  same file embedded as an `<img>` in the sidebar toolbar button.
- Removed the mask-based recolouring and the derived `assets/seedcode-on-light.svg`, so the logo keeps
  its original fills (`#7bed9f`, `#2ecc71`, `#1b7a43`) and transparent background.
- The Activity Bar container icon stays monochrome (`assets/seedcode.svg`), which is what VS Code
  expects for a theme-adaptive Activity Bar entry.
- The editor tab icon stays on `assets/logo.png`, the colored brand mark.
- Tests updated: colored asset is required for the command and the webview button, multi-colour fills
  are asserted, the Activity Bar icon is asserted to stay monochrome, and masking is rejected.

## [2.1.2] - 2026-11-02

### Fixed — Branding icon for Open in Editor Tab

- The editor title toolbar entry now uses the SeedCode seedling artwork instead of a generic codicon. The
  command icon is a light/dark pair (`assets/seedcode-on-light.svg` for light themes,
  `assets/seedcode.svg` for dark themes) so it stays visible on both.
- The sidebar toolbar action is now an icon button instead of a text button. It uses the same SVG as a CSS
  mask tinted with `currentColor`, so it follows the theme icon colour, is sized 16x16 inside a 24x22
  button, and carries `title`/`aria-label` of "Open in Editor Tab".
- Command id, command count and all CLI behaviour are unchanged.
- Added a dark-ink icon asset and tests that assert both icon variants exist under `assets/`, that no
  codicon is used, and that the webview button exposes the icon and its tooltip.

## [2.1.1] - 2026-11-02

### Added — Command in the editor title toolbar

- Added an `editor/title` menu entry for `seedcode.openInEditor`, so after installing the extension a
  SeedCode CLI icon appears in the editor title toolbar (next to the split editor actions) and opens
  or reveals the SeedCode CLI tab. The entry has no `when` clause, so it is available for any editor.
- `seedcode.openInEditor` now uses the `$(terminal)` icon, and `seedcode.openTerminal` (Focus Sidebar)
  uses `$(layout-sidebar-left)` so the two commands are visually distinct.
- Test coverage extended to assert the `editor/title` contribution and the command icon.

## [2.1.0] - 2026-11-02

### Added — Open in Editor Tab

- New command `seedcode.openInEditor` (`SeedCode CLI: Open in Editor Tab`) that opens the SeedCode
  CLI interface in a `vscode.window.createWebviewPanel()` tab titled `SeedCode CLI`, using
  `assets/logo.png` as the tab icon. Running the command again reveals the existing tab instead of
  creating another one, and closing the tab does not affect the sidebar or the CLI process.
- The command is reachable from the Command Palette, the SeedCode CLI sidebar title bar, and an
  `Open in Tab` button in the sidebar toolbar.
- Both surfaces share one PTY session: the second surface replays the session buffer and attaches to
  the running CLI, so opening a tab never spawns a second backend process.

### Changed — Shared webview implementation

- Extracted the webview markup into `src/providers/seedCodeWebviewContent.ts` and the message/PTY
  handling into `src/providers/seedCodeWebviewHost.ts`. The Activity Bar view provider and the new
  editor panel both extend the shared host, so the sidebar and the tab render the same document.
- Renamed the extension to **SeedCode CLI** (`displayName`), updated the description, and moved all
  commands to the `SeedCode CLI` category. Command IDs are unchanged.
- Command titles aligned with the new branding: `Open in Sidebar`, `Open in Editor Tab`,
  `Focus Sidebar`.
- Theme handling for the editor tab uses `var(--vscode-editor-background)` fallbacks, so light and
  dark themes render correctly in both hosts.
- README rewritten to match the implementation, including the new command, configuration status and
  known limitations.

## [2.0.2] - 2026-11-02

### Fixed — SeedCode now owns an independent Activity Bar icon

**Root cause:** the SeedCode webview was contributed as a child view of the built-in `explorer`
container (`contributes.views.explorer`). VS Code therefore rendered "SeedCode CLI" **inside the
File Explorer sidebar** instead of giving the extension its own primary Activity Bar entry, because
an extension only gets a dedicated icon when it contributes an `activitybar` view container.

- **Independent container:** the view is contributed exclusively under
  `contributes.viewsContainers.activitybar` (`id: seedcode`, title: `SeedCode`) and
  `contributes.views.seedcode` (`id: seedcode.cliView`, name: `SeedCode CLI`, type: `webview`).
  Nothing is registered in `contributes.views.explorer`, so the File Explorer no longer shows a
  SeedCode section.
- **Icon path standardized:** the Activity Bar icon is now `assets/seedcode.svg` for every build
  (earlier packages pointed the container at `media/icon.svg`). The SVG keeps the SeedCode seedling
  artwork, a `0 0 24 24` viewBox, centered ink (5.5px margins) and a single monochrome `#D7DAE0`
  fill so it reads correctly on light, dark and high-contrast themes.
- **Provider registration:** `registerWebviewViewProvider` uses the contributed view ID
  (`SeedCodeViewProvider.viewType === 'seedcode.cliView'`); all `seedcode.cliView.focus` command
  handlers still target the same ID. No second provider or duplicate UI was introduced.
- **Regression tests:** the suite now fails if a SeedCode view reappears under
  `contributes.views.explorer`, if the container/view IDs drift, if the icon path does not resolve,
  or if the provider view type no longer matches the manifest.
- **Compatibility:** CLI detection, installation, launch/restart commands, embedded PTY terminal,
  workspace detection and Windows/Linux support are unchanged.

## [2.0.0] - 2026-11-02

### Fixed — Activity Bar UI Placement (Independent View Container)
- **Independent Activity Bar Container**:
  - Confirmed `contributes.viewsContainers.activitybar` defines a standalone SeedCode container (`id: "seedcode"`) with `media/icon.svg` — completely separate from the default File Explorer sidebar.
  - Confirmed `contributes.views.seedcode` registers the `seedcode.cliView` webview **only** under the custom container ID, not under `explorer`.
  - This ensures the SeedCode icon appears as its own dedicated tab in the primary Activity Bar, identical in behaviour to extensions like GitLens or OpenCode.
- **Release Assets**:
  - All previous VSIX packages (`1.0.0`, `1.0.1`, `1.1.0`) are preserved alongside the new `2.0.0` build as GitHub release assets.

## [1.0.1] - 2026-11-02

### Fixed — Activity Bar Icon & View Container Resolution
- **Activity Bar Icon Visibility**:
  - Rebuilt `assets/seedcode.svg` with official VS Code 24x24 `viewBox="0 0 24 24"`, symmetrical 5px vertical margin, 5px/6px horizontal margin, and `#D7DAE0` monochrome fill for crisp rendering across both dark and light themes.
- **View Container & View Registration**:
  - Registered View Container directly under `contributes.viewsContainers.activitybar` with ID `seedcode`, title `SeedCode`, and icon `assets/seedcode.svg`.
  - Registered primary view under `contributes.views.seedcode` with ID `seedcode.cliView` and name `SeedCode CLI`.
  - Updated all command triggers and view providers to target `seedcode.cliView`.
- **Immediate Visibility**:
  - The SeedCode icon appears in the primary VS Code Activity Bar immediately upon extension installation.
  - Clicking the icon immediately opens the SeedCode CLI view without requiring manual command execution or an open workspace.
- **Embedded Terminal Engine**:
  - Maintained interactive embedded PTY (`node-pty` + `xterm.js`) experience inside the sidebar.

## [1.0.0] - 2026-11-02

### Added
- Initial extension release with CLI detection, cross-platform installation scripts, and session management.
