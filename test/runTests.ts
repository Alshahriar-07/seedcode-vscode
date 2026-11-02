import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import { PlatformDetector } from '../src/services/platformDetector';
import { CliDetector } from '../src/services/cliDetector';
import { PathResolver } from '../src/utils/paths';
import { PtySessionManager } from '../src/services/ptySessionManager';
import { InstallationManager } from '../src/services/installationManager';
import { SeedCodeViewProvider } from '../src/providers/seedcodeViewProvider';
import { SeedCodeEditorPanel } from '../src/providers/seedcodeEditorPanel';
import { buildInstallationHtml, buildTerminalHtml } from '../src/providers/seedCodeWebviewContent';
import { createMockWebview, mockPanels, Uri as MockUri } from './mockVscode';

async function runTestSuite() {
  console.log('========================================================');
  console.log('🧪 RUNNING SEEDCODE CLI EXTENSION v2.1.4 TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, extraInfo = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${testName} ${extraInfo ? `(${extraInfo})` : ''}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${extraInfo ? `(${extraInfo})` : ''}`);
      failed++;
    }
  }

  // --- Test Suite 1: Activity Bar Manifest Verification ---
  console.log('▶ Test Suite 1: Activity Bar Registration Verification');
  const pkgJsonPath = path.join(process.cwd(), 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

  assert(!!pkgJson.contributes.viewsContainers.activitybar, 'Manifest registers viewsContainers in activitybar');
  assert(pkgJson.contributes.viewsContainers.activitybar.length === 1, 'Exactly one custom Activity Bar container is contributed');
  const container = pkgJson.contributes.viewsContainers.activitybar[0];
  assert(container.id === 'seedcode', 'Container ID is exactly "seedcode"');
  assert(container.title === 'SeedCode', 'Container title is "SeedCode"');
  assert(container.icon === 'assets/seedcode.svg', 'Container icon path is "assets/seedcode.svg"');
  assert(fs.existsSync(path.join(process.cwd(), container.icon)), 'Container icon path resolves on disk', container.icon);

  const views = pkgJson.contributes.views.seedcode;
  assert(Array.isArray(views) && views.length > 0, 'Views registered under container ID "seedcode"');
  assert(views[0].id === 'seedcode.cliView', 'View ID is "seedcode.cliView"');
  assert(views[0].name === 'SeedCode CLI', 'View name is "SeedCode CLI"');
  assert(views[0].type === 'webview', 'View type is "webview"');

  // Regression: the SeedCode view must NOT live inside the built-in Explorer container
  const viewGroups = Object.keys(pkgJson.contributes.views);
  assert(viewGroups.length === 1 && viewGroups[0] === 'seedcode', 'seedcode.cliView is contributed only under the custom "seedcode" container', viewGroups.join(','));
  assert(!pkgJson.contributes.views.explorer, 'No SeedCode view registered in contributes.views.explorer');

  // The provider must register the exact contributed view ID
  assert(SeedCodeViewProvider.viewType === views[0].id, 'WebviewViewProvider view type matches contributed view ID', SeedCodeViewProvider.viewType);
  const extensionSource = fs.readFileSync(path.join(process.cwd(), 'src', 'extension.ts'), 'utf8');
  assert(extensionSource.includes('registerWebviewViewProvider'), 'extension.ts registers the webview view provider');
  assert(
    Array.isArray(pkgJson.activationEvents) && pkgJson.activationEvents.includes('onView:seedcode.cliView'),
    'Activation event targets onView:seedcode.cliView'
  );

  // --- Test Suite 2: SVG Icon Verification (24x24 viewBox & Monochrome) ---
  console.log('\n▶ Test Suite 2: SVG Icon Asset Verification');
  const svgPath = path.join(process.cwd(), 'assets', 'seedcode.svg');
  assert(fs.existsSync(svgPath), 'assets/seedcode.svg exists on disk');
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  assert(svgContent.includes('viewBox="0 0 24 24"'), 'SVG contains 24x24 viewBox', 'viewBox="0 0 24 24"');
  assert(svgContent.includes('fill="#D7DAE0"'), 'SVG uses monochrome fill #D7DAE0', 'fill="#D7DAE0"');
  assert(svgContent.startsWith('<svg') && svgContent.trim().endsWith('</svg>'), 'SVG is valid XML markup');

  // --- Test Suite 3: Webview Media Assets Verification ---
  console.log('\n▶ Test Suite 3: Webview Media Assets Verification');
  const mediaFiles = ['xterm.css', 'xterm.js', 'addon-fit.js', 'terminal.js'];
  for (const file of mediaFiles) {
    const filePath = path.join(process.cwd(), 'media', file);
    const exists = fs.existsSync(filePath);
    const size = exists ? fs.statSync(filePath).size : 0;
    assert(exists && size > 0, `Media asset exists: ${file}`, `${size} bytes`);
  }

  // --- Test Suite 4: PlatformDetector ---
  console.log('\n▶ Test Suite 4: PlatformDetector');
  const platform = PlatformDetector.getPlatformInfo();
  assert(typeof platform.name === 'string' && platform.name.length > 0, 'Platform name detected', platform.name);
  if (process.platform === 'win32') {
    assert(PlatformDetector.isWindows() === true, 'PlatformDetector.isWindows() returns true on Windows');
    assert(platform.installCommand === 'irm https://seedcode-cli.vercel.app/install.ps1 | iex', 'Windows install command matches requirement');
  } else if (process.platform === 'linux') {
    assert(PlatformDetector.isLinux() === true, 'PlatformDetector.isLinux() returns true on Linux');
    assert(platform.installCommand === 'curl -fsSL https://seedcode-cli.vercel.app/install.sh | bash', 'Linux install command matches requirement');
  }

  // --- Test Suite 5: PathResolver (With and Without Workspace) ---
  console.log('\n▶ Test Suite 5: PathResolver');
  const homedir = PathResolver.expandHome('~');
  assert(typeof homedir === 'string' && homedir.length > 0, 'expandHome expands ~ to valid string', homedir);
  const effectiveCwd = PathResolver.getEffectiveWorkingDirectory();
  assert(typeof effectiveCwd.cwd === 'string' && effectiveCwd.cwd.length > 0, 'Effective working directory resolved', effectiveCwd.cwd);

  // --- Test Suite 6: CliDetector (Live System Test) ---
  console.log('\n▶ Test Suite 6: CliDetector (Live System Test)');
  CliDetector.invalidateCache();
  const detectionResult = await CliDetector.detect(true);
  console.log('  Live detection result:', JSON.stringify(detectionResult, null, 2));
  assert(typeof detectionResult.installed === 'boolean', 'CliDetector returns boolean installed flag');

  if (detectionResult.installed) {
    assert(!!detectionResult.executablePath, 'Executable path discovered', detectionResult.executablePath || '');
    assert(!!detectionResult.version, 'Version queried successfully', detectionResult.version || '');
  }

  // --- Test Suite 7: PTY Session Manager ---
  console.log('\n▶ Test Suite 7: PtySessionManager');
  const ptyMgr = PtySessionManager.getInstance();
  assert(!ptyMgr.running, 'PTY session is initially not running');

  if (detectionResult.installed && detectionResult.executablePath) {
    let ptyOutput = '';
    const removeListener = ptyMgr.onData((data) => {
      ptyOutput += data;
    });

    console.log('  Spawning SeedCode in embedded PTY...');
    const started = ptyMgr.start({
      executable: detectionResult.executablePath,
      args: ['--version'],
      cwd: process.cwd(),
      cols: 80,
      rows: 24
    });

    assert(started === true, 'PtySessionManager.start() returns true');
    assert(ptyMgr.running === true, 'PTY session reports running === true');

    // Wait for PTY output chunks to arrive
    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (ptyOutput.includes('Seed Code') || ptyOutput.includes('9.2.0')) {
          clearInterval(check);
          resolve(true);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        resolve(false);
      }, 3500);
    });

    console.log('  Captured PTY raw output length:', ptyOutput.length);
    assert(ptyOutput.length > 0, 'PTY received terminal output stream', `${ptyOutput.length} characters`);
    assert(ptyOutput.includes('Seed Code') || ptyOutput.includes('9.2.0'), 'PTY output contains Seed Code banner');

    // Test buffer replay
    const buffer = ptyMgr.getBuffer();
    assert(buffer.length > 0, 'PtySessionManager buffers output for webview reconnects', `${buffer.length} characters`);

    // Clean up
    removeListener();
    ptyMgr.kill();
    assert(!ptyMgr.running, 'PtySessionManager.kill() terminates session');
  }

  // --- Test Suite 8: InstallationManager Status Transitions ---
  console.log('\n▶ Test Suite 8: InstallationManager');
  const installMgr = InstallationManager.getInstance();
  const status = await installMgr.checkInstallation(true);
  assert(status.state === (detectionResult.installed ? 'installed' : 'not_installed'), 'InstallationManager reflects detected state', status.state);
  assert(status.platform.isSupported === true, 'Platform is supported');

  // --- Test Suite 9: Editor Tab Webview Panel ---
  console.log('\n▶ Test Suite 9: Editor Tab Webview Panel');
  const extensionUri = MockUri.file(process.cwd()) as any;
  const firstPanelHost = SeedCodeEditorPanel.show(extensionUri);
  assert(mockPanels.length === 1, 'Open in Editor Tab creates a single webview panel', `${mockPanels.length} panel(s)`);

  const panelInstance = mockPanels[0];
  assert(panelInstance.viewType === 'seedcode.editorPanel', 'Panel view type is "seedcode.editorPanel"', panelInstance.viewType);
  assert(panelInstance.title === 'SeedCode CLI', 'Editor tab title is "SeedCode CLI"', panelInstance.title);
  assert(!!panelInstance.iconPath, 'Editor tab uses the SeedCode branding icon');
  assert(
    panelInstance.iconPath && panelInstance.iconPath.fsPath === 'assets/seedcode-colored-with-bg.svg',
    'Editor tab iconPath points at the colored-with-background logo',
    panelInstance.iconPath && panelInstance.iconPath.fsPath
  );

  // Let the asynchronous installation check finish rendering
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const panelHtml: string = panelInstance.webview.html;
  assert(panelHtml.length > 0, 'Panel webview renders HTML', `${panelHtml.length} characters`);
  assert(
    panelHtml.includes('terminal-container') || panelHtml.includes('btn-install'),
    'Panel renders the shared SeedCode CLI interface'
  );

  const secondPanelHost = SeedCodeEditorPanel.show(extensionUri);
  assert(mockPanels.length === 1, 'Reopening the tab does not create a duplicate panel');
  assert(secondPanelHost === firstPanelHost, 'The same panel host instance is reused');
  assert(panelInstance.revealed >= 1, 'Existing tab is revealed instead of re-created');

  panelInstance.dispose();
  assert(SeedCodeEditorPanel.currentPanel === undefined, 'Closing the tab clears the cached panel');
  SeedCodeEditorPanel.show(extensionUri);
  assert(mockPanels.length === 1, 'Tab can be reopened after being closed');
  assert(SeedCodeEditorPanel.currentPanel !== undefined, 'Reopened tab registers a new panel host');
  mockPanels[0].dispose();
  assert(mockPanels.length === 0, 'Closed tabs are released');

  // --- Test Suite 10: Shared Webview UI (Sidebar + Editor Tab) ---
  console.log('\n▶ Test Suite 10: Shared Webview UI');
  const sharedWebview = createMockWebview() as any;
  const sharedStatus = InstallationManager.getInstance().getStatus();
  const terminalHtml = buildTerminalHtml(sharedWebview, extensionUri, sharedStatus);
  assert(terminalHtml.includes('id="terminal-container"'), 'Shared terminal HTML contains the xterm container');
  assert(terminalHtml.includes('id="btn-open-editor"'), 'Shared terminal HTML exposes the "Open in Editor Tab" action');
  assert(
    terminalHtml.includes('title="Open in Editor Tab"') && terminalHtml.includes('aria-label="Open in Editor Tab"'),
    'Open in Editor Tab button has an accessible tooltip'
  );
  assert(
    terminalHtml.includes('class="brand-icon"') &&
      terminalHtml.includes('src="vscode-resource://') &&
      terminalHtml.includes('seedcode-colored-with-bg.svg'),
    'Open in Editor Tab button embeds the original colored SeedCode SVG'
  );
  assert(!terminalHtml.includes('mask-image'), 'Open in Editor Tab no longer masks the icon into a monochrome shape');
  assert(terminalHtml.includes('id="btn-term-restart"'), 'Shared terminal HTML keeps the Restart action');
  assert(terminalHtml.includes('SeedCode CLI'), 'Shared terminal HTML uses SeedCode CLI branding');

  const installHtml = buildInstallationHtml(sharedWebview, extensionUri, {
    state: 'not_installed',
    platform: PlatformDetector.getPlatformInfo()
  });
  assert(installHtml.includes('id="btn-install"'), 'Shared installation HTML contains the install action');
  assert(installHtml.includes('SeedCode CLI'), 'Shared installation HTML uses SeedCode CLI branding');

  const providerSource = fs.readFileSync(path.join(process.cwd(), 'src', 'providers', 'seedcodeViewProvider.ts'), 'utf8');
  const panelSource = fs.readFileSync(path.join(process.cwd(), 'src', 'providers', 'seedcodeEditorPanel.ts'), 'utf8');
  const hostSource = fs.readFileSync(path.join(process.cwd(), 'src', 'providers', 'seedCodeWebviewHost.ts'), 'utf8');
  assert(!providerSource.includes('acquireVsCodeApi'), 'Sidebar provider does not duplicate the webview markup');
  assert(!panelSource.includes('acquireVsCodeApi'), 'Editor panel does not duplicate the webview markup');
  assert(hostSource.includes('buildTerminalHtml'), 'Both hosts share one webview implementation');
  assert(
    providerSource.includes('SeedCodeWebviewHost') && panelSource.includes('SeedCodeWebviewHost'),
    'Sidebar and editor tab extend the same webview host'
  );

  // --- Test Suite 11: Extension Metadata & Commands ---
  console.log('\n▶ Test Suite 11: Extension Metadata & Commands');
  const commandContributions = pkgJson.contributes.commands as any[];
  const openInEditorCommand = commandContributions.find((c) => c.command === 'seedcode.openInEditor');
  assert(!!openInEditorCommand, 'Command "seedcode.openInEditor" is contributed');
  assert(openInEditorCommand?.title === 'Open in Editor Tab', 'Command title is "Open in Editor Tab"', openInEditorCommand?.title);
  assert(openInEditorCommand?.category === 'SeedCode CLI', 'Command uses the "SeedCode CLI" category', openInEditorCommand?.category);
  assert(pkgJson.displayName === 'SeedCode CLI', 'Extension displayName is "SeedCode CLI"', pkgJson.displayName);
  assert(pkgJson.author?.name === 'Al Shahriar Sowan', 'Extension author is Al Shahriar Sowan', pkgJson.author?.name);
  assert(
    Array.isArray(pkgJson.activationEvents) && pkgJson.activationEvents.includes('onCommand:seedcode.openInEditor'),
    'Activation event registered for the editor tab command'
  );
  assert(
    (pkgJson.contributes.menus['view/title'] as any[]).some(
      (m) => m.command === 'seedcode.openInEditor' && m.when === 'view == seedcode.cliView'
    ),
    'Sidebar title bar exposes Open in Editor Tab'
  );
  assert(
    (pkgJson.contributes.menus.commandPalette as any[]).some((m) => m.command === 'seedcode.openInEditor'),
    'Command Palette exposes Open in Editor Tab'
  );
  assert(
    Array.isArray(pkgJson.contributes.menus['editor/title']) &&
      (pkgJson.contributes.menus['editor/title'] as any[]).some((m) => m.command === 'seedcode.openInEditor'),
    'Editor title toolbar exposes the SeedCode CLI icon'
  );
  const openInEditorIcon = openInEditorCommand?.icon;
  assert(
    !!openInEditorIcon && typeof openInEditorIcon === 'object' && !!openInEditorIcon.light && !!openInEditorIcon.dark,
    'Open in Editor Tab defines light and dark icon variants',
    JSON.stringify(openInEditorIcon)
  );
  assert(
    typeof openInEditorIcon === 'object' &&
      openInEditorIcon.light === 'assets/seedcode-colored-with-bg.svg' &&
      openInEditorIcon.dark === 'assets/seedcode-colored-with-bg.svg',
    'Open in Editor Tab uses the colored-with-background logo'
  );
  assert(
    typeof openInEditorIcon === 'object' &&
      fs.existsSync(path.join(process.cwd(), openInEditorIcon.light)),
    'Colored SeedCode icon exists on disk',
    openInEditorIcon?.light
  );
  assert(
    typeof openInEditorIcon === 'object' &&
      !String(JSON.stringify(openInEditorIcon)).includes('$('),
    'Open in Editor Tab does not use a generic codicon'
  );

  const coloredIconSource = fs.readFileSync(path.join(process.cwd(), 'assets', 'seedcode-colored-with-bg.svg'), 'utf8');
  const coloredFills = new Set((coloredIconSource.match(/fill="#[0-9a-fA-F]{6}"/g) || []).map((f) => f.toLowerCase()));
  assert(coloredFills.size >= 2, 'Colored SeedCode SVG keeps its original multi-colour fills', `${coloredFills.size} colours`);
  assert(
    pkgJson.contributes.viewsContainers.activitybar[0].icon === 'assets/seedcode.svg',
    'Activity Bar icon stays monochrome and theme-adaptive'
  );

  const readme = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
  for (const section of [
    '## Features',
    '## Requirements',
    '## Installation',
    '## Getting Started',
    '## Available Commands',
    '## Configuration',
    '## Development',
    '## Known Limitations',
    '## Author',
    '## License'
  ]) {
    assert(readme.includes(section), `README contains the "${section.replace('## ', '')}" section`);
  }
  assert(readme.includes('Al Shahriar Sowan'), 'README credits Al Shahriar Sowan as author');
  assert(
    !/revolutionary|next-generation|powerful ecosystem|seamless/i.test(readme),
    'README avoids marketing language'
  );

  // --- Summary ---
  console.log('\n========================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
