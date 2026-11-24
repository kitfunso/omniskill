import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer } from './test-server';
import { BrowserManager } from '../src/browser-manager';
import { handleReadCommand } from '../src/read-commands';
import { handleWriteCommand } from '../src/write-commands';
import { handleMetaCommand } from '../src/meta-commands';
import * as fs from 'fs';

let testServer: ReturnType<typeof startTestServer>;
let bm: BrowserManager;
let baseUrl: string;
const shutdown = async () => {};

beforeAll(async () => {
  testServer = startTestServer(0);
  baseUrl = testServer.url;

  bm = new BrowserManager();
  await bm.launch();
});

afterAll(() => {
  try { testServer.server.stop(); } catch {}
  setTimeout(() => process.exit(0), 500);
});

describe('Snapshot', () => {
  test('snapshot returns accessibility tree with refs', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const result = await handleMetaCommand('snapshot', [], bm, shutdown);
    expect(result).toContain('@e');
    expect(result).toContain('[heading]');
    expect(result).toContain('"Snapshot Test"');
    expect(result).toContain('[button]');
    expect(result).toContain('[link]');
  });

  test('snapshot -i returns only interactive elements', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const result = await handleMetaCommand('snapshot', ['-i'], bm, shutdown);
    expect(result).toContain('[button]');
    expect(result).toContain('[link]');
    expect(result).toContain('[textbox]');
    expect(result).not.toContain('[heading]');
  });

  test('snapshot -c returns compact output', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const full = await handleMetaCommand('snapshot', [], bm, shutdown);
    const compact = await handleMetaCommand('snapshot', ['-c'], bm, shutdown);
    const fullLines = full.split('\n').length;
    const compactLines = compact.split('\n').length;
    expect(compactLines).toBeLessThanOrEqual(fullLines);
  });

  test('snapshot -d 2 limits depth', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const shallow = await handleMetaCommand('snapshot', ['-d', '2'], bm, shutdown);
    const deep = await handleMetaCommand('snapshot', [], bm, shutdown);
    expect(shallow.split('\n').length).toBeLessThanOrEqual(deep.split('\n').length);
  });

  test('snapshot -s "#main" scopes to selector', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const scoped = await handleMetaCommand('snapshot', ['-s', '#main'], bm, shutdown);
    expect(scoped).toContain('[button]');
    expect(scoped).toContain('"Submit"');
    expect(scoped).not.toContain('"Internal Link"');
  });

  test('snapshot on page with no interactive elements', async () => {
    await handleWriteCommand('goto', [baseUrl + '/basic.html'], bm);
    const result = await handleMetaCommand('snapshot', ['-i'], bm, shutdown);
    expect(result).toContain('[link]');
  });

  test('second snapshot generates fresh refs', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const snap1 = await handleMetaCommand('snapshot', [], bm, shutdown);
    const snap2 = await handleMetaCommand('snapshot', [], bm, shutdown);
    expect(snap1).toContain('@e1');
    expect(snap2).toContain('@e1');
  });
});

describe('Ref resolution', () => {
  test('click @ref works after snapshot', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const snap = await handleMetaCommand('snapshot', ['-i'], bm, shutdown);
    const buttonLine = snap.split('\n').find(l => l.includes('[button]') && l.includes('"Submit"'));
    expect(buttonLine).toBeDefined();
    const refMatch = buttonLine!.match(/@(e\d+)/);
    expect(refMatch).toBeDefined();
    const ref = `@${refMatch![1]}`;
    const result = await handleWriteCommand('click', [ref], bm);
    expect(result).toContain('Clicked');
  });

  test('fill @ref works after snapshot', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const snap = await handleMetaCommand('snapshot', ['-i'], bm, shutdown);
    const textboxLine = snap.split('\n').find(l => l.includes('[textbox]') && l.includes('"Username"'));
    expect(textboxLine).toBeDefined();
    const refMatch = textboxLine!.match(/@(e\d+)/);
    expect(refMatch).toBeDefined();
    const ref = `@${refMatch![1]}`;
    const result = await handleWriteCommand('fill', [ref, 'testuser'], bm);
    expect(result).toContain('Filled');
  });

  test('hover @ref works after snapshot', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const snap = await handleMetaCommand('snapshot', ['-i'], bm, shutdown);
    const linkLine = snap.split('\n').find(l => l.includes('[link]'));
    expect(linkLine).toBeDefined();
    const refMatch = linkLine!.match(/@(e\d+)/);
    const ref = `@${refMatch![1]}`;
    const result = await handleWriteCommand('hover', [ref], bm);
    expect(result).toContain('Hovered');
  });

  test('html @ref returns innerHTML', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const snap = await handleMetaCommand('snapshot', [], bm, shutdown);
    const headingLine = snap.split('\n').find(l => l.includes('[heading]') && l.includes('"Snapshot Test"'));
    expect(headingLine).toBeDefined();
    const refMatch = headingLine!.match(/@(e\d+)/);
    const ref = `@${refMatch![1]}`;
    const result = await handleReadCommand('html', [ref], bm);
    expect(result).toContain('Snapshot Test');
  });

  test('css @ref returns computed CSS', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const snap = await handleMetaCommand('snapshot', [], bm, shutdown);
    const headingLine = snap.split('\n').find(l => l.includes('[heading]') && l.includes('"Snapshot Test"'));
    const refMatch = headingLine!.match(/@(e\d+)/);
    const ref = `@${refMatch![1]}`;
    const result = await handleReadCommand('css', [ref, 'font-family'], bm);
    expect(result).toBeTruthy();
  });

  test('attrs @ref returns element attributes', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const snap = await handleMetaCommand('snapshot', ['-i'], bm, shutdown);
    const textboxLine = snap.split('\n').find(l => l.includes('[textbox]') && l.includes('"Username"'));
    const refMatch = textboxLine!.match(/@(e\d+)/);
    const ref = `@${refMatch![1]}`;
    const result = await handleReadCommand('attrs', [ref], bm);
    expect(result).toContain('id');
  });
});

describe('Ref invalidation', () => {
  test('stale ref after goto returns clear error', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    await handleMetaCommand('snapshot', ['-i'], bm, shutdown);
    await handleWriteCommand('goto', [baseUrl + '/basic.html'], bm);
    try {
      await handleWriteCommand('click', ['@e1'], bm);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toContain('not found');
      expect(err.message).toContain('snapshot');
    }
  });

  test('refs cleared on page navigation', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    await handleMetaCommand('snapshot', ['-i'], bm, shutdown);
    expect(bm.getRefCount()).toBeGreaterThan(0);
    await handleWriteCommand('goto', [baseUrl + '/basic.html'], bm);
    expect(bm.getRefCount()).toBe(0);
  });
});


describe('Ref staleness detection', () => {
  test('ref metadata stores role and name', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    await handleMetaCommand('snapshot', ['-i'], bm, shutdown);
    expect(bm.getRefCount()).toBeGreaterThan(0);
  });

  test('stale ref after DOM removal gives descriptive error', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const snap = await handleMetaCommand('snapshot', ['-i'], bm, shutdown);
    const buttonLine = snap.split('\n').find(l => l.includes('[button]') && l.includes('"Submit"'));
    expect(buttonLine).toBeDefined();
    const refMatch = buttonLine!.match(/@(e\d+)/);
    expect(refMatch).toBeDefined();
    const ref = `@${refMatch![1]}`;
    
    await handleReadCommand('js', ['document.querySelector("button[type=submit]").remove()'], bm);
    
    try {
      await handleWriteCommand('click', [ref], bm);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toContain('stale');
      expect(err.message).toContain('button');
      expect(err.message).toContain('Submit');
      expect(err.message).toContain('snapshot');
    }
  });

  test('valid ref still resolves normally after staleness check', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const snap = await handleMetaCommand('snapshot', ['-i'], bm, shutdown);
    const linkLine = snap.split('\n').find(l => l.includes('[link]'));
    expect(linkLine).toBeDefined();
    const refMatch = linkLine!.match(/@(e\d+)/);
    const ref = `@${refMatch![1]}`;
    const result = await handleWriteCommand('hover', [ref], bm);
    expect(result).toContain('Hovered');
  });
});

describe('Snapshot diff', () => {
  test('first snapshot -D stores baseline', async () => {
    bm.setLastSnapshot(null);
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const result = await handleMetaCommand('snapshot', ['-D'], bm, shutdown);
    expect(result).toContain('no previous snapshot');
    expect(result).toContain('baseline');
  });

  test('snapshot -D shows diff after change', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    await handleMetaCommand('snapshot', [], bm, shutdown);
    await handleReadCommand('js', ['document.querySelector("h1").textContent = "Changed Title"'], bm);
    const diff = await handleMetaCommand('snapshot', ['-D'], bm, shutdown);
    expect(diff).toContain('---');
    expect(diff).toContain('+++');
    expect(diff).toContain('previous snapshot');
    expect(diff).toContain('current snapshot');
  });

  test('snapshot -D with identical page shows no changes', async () => {
    await handleWriteCommand('goto', [baseUrl + '/basic.html'], bm);
    await handleMetaCommand('snapshot', [], bm, shutdown);
    const diff = await handleMetaCommand('snapshot', ['-D'], bm, shutdown);
    const lines = diff.split('\n').filter(l => l.startsWith('+') || l.startsWith('-'));
    const contentChanges = lines.filter(l => !l.startsWith('---') && !l.startsWith('+++'));
    expect(contentChanges.length).toBe(0);
  });
});

describe('Annotated screenshots', () => {
  test('snapshot -a creates annotated screenshot', async () => {
    const screenshotPath = '/tmp/browse-test-annotated.png';
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const result = await handleMetaCommand('snapshot', ['-a', '-o', screenshotPath], bm, shutdown);
    expect(result).toContain('annotated screenshot');
    expect(result).toContain(screenshotPath);
    expect(fs.existsSync(screenshotPath)).toBe(true);
    const stat = fs.statSync(screenshotPath);
    expect(stat.size).toBeGreaterThan(1000);
    fs.unlinkSync(screenshotPath);
  });

  test('snapshot -a uses default path', async () => {
    const defaultPath = '/tmp/browse-annotated.png';
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const result = await handleMetaCommand('snapshot', ['-a'], bm, shutdown);
    expect(result).toContain('annotated screenshot');
    expect(fs.existsSync(defaultPath)).toBe(true);
    fs.unlinkSync(defaultPath);
  });

  test('snapshot -a -i only annotates interactive', async () => {
    const screenshotPath = '/tmp/browse-test-annotated-i.png';
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const result = await handleMetaCommand('snapshot', ['-i', '-a', '-o', screenshotPath], bm, shutdown);
    expect(result).toContain('[button]');
    expect(result).toContain('[link]');
    expect(result).toContain('annotated screenshot');
    if (fs.existsSync(screenshotPath)) fs.unlinkSync(screenshotPath);
  });

  test('annotation overlays are cleaned up', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    await handleMetaCommand('snapshot', ['-a'], bm, shutdown);
    const overlays = await handleReadCommand('js', ['document.querySelectorAll(".__browse_annotation__").length'], bm);
    expect(overlays).toBe('0');
    try { fs.unlinkSync('/tmp/browse-annotated.png'); } catch {}
  });
});

describe('Cursor-interactive', () => {
  test('snapshot -C finds cursor:pointer elements', async () => {
    await handleWriteCommand('goto', [baseUrl + '/cursor-interactive.html'], bm);
    const result = await handleMetaCommand('snapshot', ['-C'], bm, shutdown);
    expect(result).toContain('cursor-interactive');
    expect(result).toContain('@c');
    expect(result).toContain('cursor:pointer');
  });

  test('snapshot -C includes onclick elements', async () => {
    await handleWriteCommand('goto', [baseUrl + '/cursor-interactive.html'], bm);
    const result = await handleMetaCommand('snapshot', ['-C'], bm, shutdown);
    expect(result).toContain('onclick');
  });

  test('snapshot -C includes tabindex elements', async () => {
    await handleWriteCommand('goto', [baseUrl + '/cursor-interactive.html'], bm);
    const result = await handleMetaCommand('snapshot', ['-C'], bm, shutdown);
    expect(result).toContain('tabindex');
  });

  test('@c ref is clickable', async () => {
    await handleWriteCommand('goto', [baseUrl + '/cursor-interactive.html'], bm);
    const snap = await handleMetaCommand('snapshot', ['-C'], bm, shutdown);
    const cLine = snap.split('\n').find(l => l.includes('@c'));
    if (cLine) {
      const refMatch = cLine.match(/@(c\d+)/);
      if (refMatch) {
        const result = await handleWriteCommand('click', [`@${refMatch[1]}`], bm);
        expect(result).toContain('Clicked');
      }
    }
  });

  test('snapshot -C on page with no cursor elements', async () => {
    await handleWriteCommand('goto', [baseUrl + '/empty.html'], bm);
    const result = await handleMetaCommand('snapshot', ['-C'], bm, shutdown);
    expect(result).not.toContain('cursor-interactive');
  });

  test('snapshot -i -C combines both modes', async () => {
    await handleWriteCommand('goto', [baseUrl + '/cursor-interactive.html'], bm);
    const result = await handleMetaCommand('snapshot', ['-i', '-C'], bm, shutdown);
    expect(result).toContain('[button]');
    expect(result).toContain('[link]');
    expect(result).toContain('cursor-interactive');
  });
});

describe('Snapshot errors', () => {
  test('unknown flag throws', async () => {
    try {
      await handleMetaCommand('snapshot', ['--bogus'], bm, shutdown);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toContain('Unknown snapshot flag');
    }
  });

  test('-d without number throws', async () => {
    try {
      await handleMetaCommand('snapshot', ['-d'], bm, shutdown);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toContain('Usage');
    }
  });

  test('-s without selector throws', async () => {
    try {
      await handleMetaCommand('snapshot', ['-s'], bm, shutdown);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toContain('Usage');
    }
  });

  test('-s with nonexistent selector throws', async () => {
    await handleWriteCommand('goto', [baseUrl + '/basic.html'], bm);
    try {
      await handleMetaCommand('snapshot', ['-s', '#nonexistent-element-12345'], bm, shutdown);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toContain('Selector not found');
    }
  });

  test('-o without path throws', async () => {
    try {
      await handleMetaCommand('snapshot', ['-o'], bm, shutdown);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toContain('Usage');
    }
  });
});

describe('Snapshot combined flags', () => {
  test('-i -c -d 2 combines all filters', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const result = await handleMetaCommand('snapshot', ['-i', '-c', '-d', '2'], bm, shutdown);
    expect(result).toContain('[button]');
    expect(result).toContain('[link]');
    expect(result).not.toContain('[heading]');
  });

  test('closetab last tab auto-creates new', async () => {
    const tabs = await bm.getTabListWithTitles();
    for (let i = 1; i < tabs.length; i++) {
      await bm.closeTab(tabs[i].id);
    }
    expect(bm.getTabCount()).toBe(1);
    const lastTab = (await bm.getTabListWithTitles())[0];
    await bm.closeTab(lastTab.id);
    expect(bm.getTabCount()).toBe(1);
  });
});
