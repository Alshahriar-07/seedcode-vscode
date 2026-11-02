import { mockTerminals } from './mockVscode';
import { PlatformDetector } from '../src/services/platformDetector';
import { CliDetector } from '../src/services/cliDetector';
import { PathResolver } from '../src/utils/paths';
import { TerminalManager } from '../src/services/terminalManager';
import { InstallationManager } from '../src/services/installationManager';

async function runTestSuite() {
  console.log('========================================================');
  console.log('🧪 RUNNING SEEDCODE VS CODE EXTENSION AUTOMATED TESTS');
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

  // --- Test Suite 1: PlatformDetector ---
  console.log('▶ Test Suite 1: PlatformDetector');
  const platform = PlatformDetector.getPlatformInfo();
  assert(typeof platform.name === 'string' && platform.name.length > 0, 'Platform name detected', platform.name);
  assert(platform.type === 'windows' || platform.type === 'linux' || platform.type === 'darwin', 'Platform type classified', platform.type);

  if (process.platform === 'win32') {
    assert(PlatformDetector.isWindows() === true, 'PlatformDetector.isWindows() returns true on Windows');
    assert(platform.installCommand === 'irm https://seedcode-cli.vercel.app/install.ps1 | iex', 'Windows install command matches requirement');
  } else if (process.platform === 'linux') {
    assert(PlatformDetector.isLinux() === true, 'PlatformDetector.isLinux() returns true on Linux');
    assert(platform.installCommand === 'curl -fsSL https://seedcode-cli.vercel.app/install.sh | bash', 'Linux install command matches requirement');
  }
  assert(platform.isSupported === (process.platform === 'win32' || process.platform === 'linux'), 'Support status accurate for OS');

  // --- Test Suite 2: PathResolver ---
  console.log('\n▶ Test Suite 2: PathResolver');
  const homedir = PathResolver.expandHome('~');
  assert(typeof homedir === 'string' && homedir.length > 0, 'expandHome expands ~ to valid string', homedir);
  const homePath = PathResolver.expandHome('~/test/path');
  assert(!homePath.startsWith('~'), 'expandHome resolves subpath correctly', homePath);
  const effectiveCwd = PathResolver.getEffectiveWorkingDirectory();
  assert(effectiveCwd.isWorkspace === true, 'Workspace root detected from active folder');
  assert(effectiveCwd.cwd === process.cwd(), 'Workspace root path matches current workspace directory');

  // --- Test Suite 3: CliDetector (Live System Test) ---
  console.log('\n▶ Test Suite 3: CliDetector (Live System Test)');
  CliDetector.invalidateCache();
  const detectionResult = await CliDetector.detect(true);
  console.log('  Live detection result:', JSON.stringify(detectionResult, null, 2));
  assert(typeof detectionResult.installed === 'boolean', 'CliDetector returns boolean installed flag');

  if (detectionResult.installed) {
    assert(!!detectionResult.executablePath, 'Executable path discovered', detectionResult.executablePath || '');
    assert(!!detectionResult.version, 'Version queried successfully', detectionResult.version || '');
    assert((detectionResult.version || '').toLowerCase().includes('seed code'), 'Version string contains Seed Code brand');
  }

  // Test caching logic
  const t0 = Date.now();
  const cached = await CliDetector.detect(false);
  const tElapsed = Date.now() - t0;
  assert(cached.installed === detectionResult.installed, 'Cached detection matches fresh detection');
  assert(tElapsed < 50, 'Cached detection returns instantaneously (<50ms)', `${tElapsed}ms`);

  // --- Test Suite 4: Terminal Management & Reusability ---
  console.log('\n▶ Test Suite 4: TerminalManager (Lifecycle & Duplication Prevention)');
  mockTerminals.length = 0; // Clear any existing mock terminals
  const terminalMgr = TerminalManager.getInstance();

  // Test 4.1: Launch CLI creates initial terminal
  const term1 = terminalMgr.launchCli();
  assert(mockTerminals.length === 1, 'Initial launch creates exactly 1 terminal');
  assert(term1.name === 'SeedCode CLI', 'Terminal name is exactly "SeedCode CLI"');
  assert((term1 as any).shown === true, 'Terminal is shown and focused');
  assert((term1 as any).sentTexts.includes('seedcode'), 'Command "seedcode" was sent to terminal');

  // Test 4.2: Duplicate launch reuses existing terminal without creating a second one
  const term2 = terminalMgr.launchCli();
  assert(mockTerminals.length === 1, 'Subsequent launch reuses existing terminal without creating duplicates');
  assert(term2 === term1, 'Terminal reference is identical');

  // Test 4.3: Restart CLI disposes old terminal and creates a fresh session
  const term3 = terminalMgr.restartCli();
  assert(mockTerminals.length === 1, 'Restart disposes previous terminal and leaves exactly 1 active terminal');
  assert((term1 as any).disposed === true, 'Previous terminal was cleanly disposed');
  assert((term3 as any).sentTexts.includes('seedcode'), 'Restart sends "seedcode" to new terminal');

  // --- Test Suite 5: InstallationManager Lifecycle ---
  console.log('\n▶ Test Suite 5: InstallationManager');
  const installMgr = InstallationManager.getInstance();
  const status = await installMgr.checkInstallation(true);
  assert(status.state === (detectionResult.installed ? 'installed' : 'not_installed'), 'InstallationManager reflects detected state', status.state);
  assert(status.platform.isSupported === true, 'Platform is supported');

  // Test status change listener event
  let eventFired = false;
  const sub = installMgr.onDidChangeStatus((_s) => {
    eventFired = true;
  });
  await installMgr.checkInstallation(true);
  assert(eventFired === true, 'Status change event was successfully delivered to listeners');
  sub.dispose();

  // --- Test Suite 6: Platform Support & Simulation ---
  console.log('\n▶ Test Suite 6: OS Detection Matrix & Scripts');
  const originalPlatform = process.platform;
  try {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    const macInfo = PlatformDetector.getPlatformInfo();
    assert(macInfo.type === 'darwin', 'macOS platform detected');
    assert(macInfo.isSupported === false, 'macOS marked unsupported for auto-install');
    assert(!macInfo.installCommand, 'No auto-install command exposed for macOS');

    Object.defineProperty(process, 'platform', { value: 'linux' });
    const linuxInfo = PlatformDetector.getPlatformInfo();
    assert(linuxInfo.type === 'linux', 'Linux platform detected');
    assert(linuxInfo.isSupported === true, 'Linux marked supported');
    assert(linuxInfo.installCommand === 'curl -fsSL https://seedcode-cli.vercel.app/install.sh | bash', 'Linux command is bash curl pipeline');

    Object.defineProperty(process, 'platform', { value: 'win32' });
    const winInfo = PlatformDetector.getPlatformInfo();
    assert(winInfo.type === 'windows', 'Windows platform detected');
    assert(winInfo.isSupported === true, 'Windows marked supported');
    assert(winInfo.installCommand === 'irm https://seedcode-cli.vercel.app/install.ps1 | iex', 'Windows command is PowerShell irm pipeline');
  } finally {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  }

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
