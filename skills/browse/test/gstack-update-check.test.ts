import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync, mkdirSync, symlinkSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const SCRIPT = join(import.meta.dir, '..', '..', 'bin', 'gstack-update-check');

let gstackDir: string;
let stateDir: string;

function run(extraEnv: Record<string, string> = {}, args: string[] = []) {
  const result = Bun.spawnSync(['bash', SCRIPT, ...args], {
    env: {
      ...process.env,
      GSTACK_DIR: gstackDir,
      GSTACK_STATE_DIR: stateDir,
      GSTACK_REMOTE_URL: `file://${join(gstackDir, 'REMOTE_VERSION')}`,
      ...extraEnv,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString().trim(),
    stderr: result.stderr.toString().trim(),
  };
}

beforeEach(() => {
  gstackDir = mkdtempSync(join(tmpdir(), 'gstack-upd-test-'));
  stateDir = mkdtempSync(join(tmpdir(), 'gstack-state-test-'));
  const binDir = join(gstackDir, 'bin');
  mkdirSync(binDir);
  symlinkSync(join(import.meta.dir, '..', '..', 'bin', 'gstack-config'), join(binDir, 'gstack-config'));
});

afterEach(() => {
  rmSync(gstackDir, { recursive: true, force: true });
  rmSync(stateDir, { recursive: true, force: true });
});

function writeSnooze(version: string, level: number, epochSeconds: number) {
  writeFileSync(join(stateDir, 'update-snoozed'), `${version} ${level} ${epochSeconds}`);
}

function writeConfig(content: string) {
  writeFileSync(join(stateDir, 'config.yaml'), content);
}

function nowEpoch(): number {
  return Math.floor(Date.now() / 1000);
}

describe('gstack-update-check', () => {
  test('exits 0 with no output when VERSION file is missing', () => {
    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
  });

  test('exits 0 with no output when VERSION file is empty', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '');
    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
  });

  test('outputs JUST_UPGRADED and deletes marker', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.4.0\n');
    writeFileSync(join(stateDir, 'just-upgraded-from'), '0.3.3\n');

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('JUST_UPGRADED 0.3.3 0.4.0');
    expect(existsSync(join(stateDir, 'just-upgraded-from'))).toBe(false);
    const cache = readFileSync(join(stateDir, 'last-update-check'), 'utf-8');
    expect(cache).toContain('UP_TO_DATE');
  });

  test('exits silently when cache says UP_TO_DATE and is fresh', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(stateDir, 'last-update-check'), 'UP_TO_DATE 0.3.3');

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
  });

  test('re-checks when UP_TO_DATE cache version does not match local', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.4.0\n');
    writeFileSync(join(stateDir, 'last-update-check'), 'UP_TO_DATE 0.3.3');
    writeFileSync(join(gstackDir, 'REMOTE_VERSION'), '0.5.0\n');

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('UPGRADE_AVAILABLE 0.4.0 0.5.0');
  });

  test('echoes cached UPGRADE_AVAILABLE when cache is fresh', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(stateDir, 'last-update-check'), 'UPGRADE_AVAILABLE 0.3.3 0.4.0');

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('UPGRADE_AVAILABLE 0.3.3 0.4.0');
  });

  test('re-checks when local version does not match cached old version', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.4.0\n');
    writeFileSync(join(stateDir, 'last-update-check'), 'UPGRADE_AVAILABLE 0.3.3 0.4.0');
    writeFileSync(join(gstackDir, 'REMOTE_VERSION'), '0.4.0\n');

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
    const cache = readFileSync(join(stateDir, 'last-update-check'), 'utf-8');
    expect(cache).toContain('UP_TO_DATE');
  });

  test('writes UP_TO_DATE cache when versions match', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(gstackDir, 'REMOTE_VERSION'), '0.3.3\n');

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
    const cache = readFileSync(join(stateDir, 'last-update-check'), 'utf-8');
    expect(cache).toContain('UP_TO_DATE');
  });

  test('outputs UPGRADE_AVAILABLE when versions differ', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(gstackDir, 'REMOTE_VERSION'), '0.4.0\n');

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('UPGRADE_AVAILABLE 0.3.3 0.4.0');
    const cache = readFileSync(join(stateDir, 'last-update-check'), 'utf-8');
    expect(cache).toContain('UPGRADE_AVAILABLE 0.3.3 0.4.0');
  });

  test('treats invalid remote response as up to date', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(gstackDir, 'REMOTE_VERSION'), '<html>404 Not Found</html>\n');

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
    const cache = readFileSync(join(stateDir, 'last-update-check'), 'utf-8');
    expect(cache).toContain('UP_TO_DATE');
  });

  test('exits silently when remote URL is unreachable', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');

    const { exitCode, stdout } = run({
      GSTACK_REMOTE_URL: 'file:///nonexistent/path/VERSION',
    });
    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
    const cache = readFileSync(join(stateDir, 'last-update-check'), 'utf-8');
    expect(cache).toContain('UP_TO_DATE');
  });

  test('falls through to remote fetch when cache is corrupt', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(stateDir, 'last-update-check'), 'garbage data here');
    writeFileSync(join(gstackDir, 'REMOTE_VERSION'), '0.3.3\n');

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
    const cache = readFileSync(join(stateDir, 'last-update-check'), 'utf-8');
    expect(cache).toContain('UP_TO_DATE');
  });

  test('creates state dir if it does not exist', () => {
    const newStateDir = join(stateDir, 'nested', 'dir');
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(gstackDir, 'REMOTE_VERSION'), '0.3.3\n');

    const { exitCode } = run({ GSTACK_STATE_DIR: newStateDir });
    expect(exitCode).toBe(0);
    expect(existsSync(join(newStateDir, 'last-update-check'))).toBe(true);
  });

  test('exits 0 with real project VERSION and unreachable remote', () => {
    const projectRoot = join(import.meta.dir, '..', '..');
    const versionFile = join(projectRoot, 'VERSION');
    if (!existsSync(versionFile)) return;
    const version = readFileSync(versionFile, 'utf-8').trim();

    writeFileSync(join(gstackDir, 'VERSION'), version + '\n');

    const { exitCode, stdout } = run({
      GSTACK_REMOTE_URL: 'file:///nonexistent/path/VERSION',
    });
    expect(exitCode).toBe(0);
    const cache = readFileSync(join(stateDir, 'last-update-check'), 'utf-8');
    expect(cache).toContain('UP_TO_DATE');
  });

  test('exits 0 when up to date (not exit 1)', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(gstackDir, 'REMOTE_VERSION'), '0.3.3\n');

    const first = run();
    expect(first.exitCode).toBe(0);
    expect(first.stdout).toBe('');

    const second = run();
    expect(second.exitCode).toBe(0);
    expect(second.stdout).toBe('');

    writeFileSync(join(gstackDir, 'REMOTE_VERSION'), '0.4.0\n');
    rmSync(join(stateDir, 'last-update-check'));
    const third = run();
    expect(third.exitCode).toBe(0);
    expect(third.stdout).toBe('UPGRADE_AVAILABLE 0.3.3 0.4.0');
  });

  test('snoozed level 1 within 24h → silent (cached path)', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(stateDir, 'last-update-check'), 'UPGRADE_AVAILABLE 0.3.3 0.4.0');
    writeSnooze('0.4.0', 1, nowEpoch() - 3600);

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
  });

  test('snoozed level 1 expired (25h ago) → outputs UPGRADE_AVAILABLE', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(stateDir, 'last-update-check'), 'UPGRADE_AVAILABLE 0.3.3 0.4.0');
    writeSnooze('0.4.0', 1, nowEpoch() - 90000);

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('UPGRADE_AVAILABLE 0.3.3 0.4.0');
  });

  test('snoozed level 2 within 48h → silent', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(stateDir, 'last-update-check'), 'UPGRADE_AVAILABLE 0.3.3 0.4.0');
    writeSnooze('0.4.0', 2, nowEpoch() - 86400);

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
  });

  test('snoozed level 2 expired (49h ago) → outputs', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(stateDir, 'last-update-check'), 'UPGRADE_AVAILABLE 0.3.3 0.4.0');
    writeSnooze('0.4.0', 2, nowEpoch() - 176400);

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('UPGRADE_AVAILABLE 0.3.3 0.4.0');
  });

  test('snoozed level 3 within 7d → silent', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(stateDir, 'last-update-check'), 'UPGRADE_AVAILABLE 0.3.3 0.4.0');
    writeSnooze('0.4.0', 3, nowEpoch() - 518400);

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
  });

  test('snoozed level 3 expired (8d ago) → outputs', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(stateDir, 'last-update-check'), 'UPGRADE_AVAILABLE 0.3.3 0.4.0');
    writeSnooze('0.4.0', 3, nowEpoch() - 691200);

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('UPGRADE_AVAILABLE 0.3.3 0.4.0');
  });

  test('snooze ignored when version differs (new version resets snooze)', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(stateDir, 'last-update-check'), 'UPGRADE_AVAILABLE 0.3.3 0.5.0');
    writeSnooze('0.4.0', 3, nowEpoch() - 60);

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('UPGRADE_AVAILABLE 0.3.3 0.5.0');
  });

  test('corrupt snooze file → outputs normally', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(stateDir, 'last-update-check'), 'UPGRADE_AVAILABLE 0.3.3 0.4.0');
    writeFileSync(join(stateDir, 'update-snoozed'), 'garbage');

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('UPGRADE_AVAILABLE 0.3.3 0.4.0');
  });

  test('non-numeric epoch in snooze file → outputs', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(stateDir, 'last-update-check'), 'UPGRADE_AVAILABLE 0.3.3 0.4.0');
    writeFileSync(join(stateDir, 'update-snoozed'), '0.4.0 1 abc');

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('UPGRADE_AVAILABLE 0.3.3 0.4.0');
  });

  test('non-numeric level in snooze file → outputs', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(stateDir, 'last-update-check'), 'UPGRADE_AVAILABLE 0.3.3 0.4.0');
    writeFileSync(join(stateDir, 'update-snoozed'), `0.4.0 abc ${nowEpoch()}`);

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('UPGRADE_AVAILABLE 0.3.3 0.4.0');
  });

  test('snooze respected on remote fetch path (no cache)', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(gstackDir, 'REMOTE_VERSION'), '0.4.0\n');
    writeSnooze('0.4.0', 1, nowEpoch() - 3600);

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
    const cache = readFileSync(join(stateDir, 'last-update-check'), 'utf-8');
    expect(cache).toContain('UPGRADE_AVAILABLE 0.3.3 0.4.0');
  });

  test('just-upgraded clears snooze file', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.4.0\n');
    writeFileSync(join(stateDir, 'just-upgraded-from'), '0.3.3\n');
    writeSnooze('0.4.0', 2, nowEpoch() - 3600);

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('JUST_UPGRADED 0.3.3 0.4.0');
    expect(existsSync(join(stateDir, 'update-snoozed'))).toBe(false);
  });

  test('update_check: false disables all checks', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(gstackDir, 'REMOTE_VERSION'), '0.4.0\n');
    writeConfig('update_check: false\n');

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
    expect(existsSync(join(stateDir, 'last-update-check'))).toBe(false);
  });

  test('missing config.yaml does not crash', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(gstackDir, 'REMOTE_VERSION'), '0.4.0\n');

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('UPGRADE_AVAILABLE 0.3.3 0.4.0');
  });

  test('--force busts fresh UP_TO_DATE cache', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(gstackDir, 'REMOTE_VERSION'), '0.4.0\n');
    writeFileSync(join(stateDir, 'last-update-check'), 'UP_TO_DATE 0.3.3');

    const cached = run();
    expect(cached.stdout).toBe('');

    const forced = run({}, ['--force']);
    expect(forced.exitCode).toBe(0);
    expect(forced.stdout).toBe('UPGRADE_AVAILABLE 0.3.3 0.4.0');
  });

  test('--force busts fresh UPGRADE_AVAILABLE cache', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(gstackDir, 'REMOTE_VERSION'), '0.3.3\n');
    writeFileSync(join(stateDir, 'last-update-check'), 'UPGRADE_AVAILABLE 0.3.3 0.4.0');

    const cached = run();
    expect(cached.stdout).toBe('UPGRADE_AVAILABLE 0.3.3 0.4.0');

    const forced = run({}, ['--force']);
    expect(forced.exitCode).toBe(0);
    expect(forced.stdout).toBe('');
    const cache = readFileSync(join(stateDir, 'last-update-check'), 'utf-8');
    expect(cache).toContain('UP_TO_DATE');
  });

  test('UP_TO_DATE cache expires after 60 min (not 720)', () => {
    writeFileSync(join(gstackDir, 'VERSION'), '0.3.3\n');
    writeFileSync(join(gstackDir, 'REMOTE_VERSION'), '0.4.0\n');
    writeFileSync(join(stateDir, 'last-update-check'), 'UP_TO_DATE 0.3.3');

    const ninetyMinAgo = new Date(Date.now() - 90 * 60 * 1000);
    const cachePath = join(stateDir, 'last-update-check');
    utimesSync(cachePath, ninetyMinAgo, ninetyMinAgo);

    const { exitCode, stdout } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toBe('UPGRADE_AVAILABLE 0.3.3 0.4.0');
  });
});
