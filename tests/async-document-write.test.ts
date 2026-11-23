import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const { transpileModule, ModuleKind } = require('typescript');

// Run the real export functions with SDK 58's asynchronous write contract.
// A manually released write makes ordering deterministic, including failures.
function documentExport(kind: 'csv' | 'rapor') {
  let resolveWrite!: () => void;
  let rejectWrite!: (error: Error) => void;
  const pendingWrite = new Promise<void>((resolve, reject) => {
    resolveWrite = resolve;
    rejectWrite = reject;
  });
  // Observe the native promise even when testing the broken, unawaited caller.
  void pendingWrite.catch(() => {});
  const events: string[] = [];
  let active = true;
  class File {
    uri = 'file:///cache/report';
    exists = false;
    create() { this.exists = true; }
    write() {
      events.push('write-start');
      const result = pendingWrite.then(() => { this.exists = true; events.push('write-done'); });
      void result.catch(() => {});
      return result;
    }
    delete() { this.exists = false; events.push('delete'); }
  }
  const modules: Record<string, unknown> = {
    'expo-file-system': { File, Paths: { cache: {} }, EncodingType: { UTF8: 'utf8' } },
    'expo-sharing': { isAvailableAsync: async () => true, shareAsync: async () => { events.push('share'); } },
    'expo-print': {},
    '@/api/client': {
      requestPdf: async () => new ArrayBuffer(4),
      api: { izinLaporanCsv: async () => ({ konten: 'nama\nSBX', nama_berkas: 'izin.csv', jumlah_baris: 1 }) },
    },
    '@/report/print-dialog': {},
    '@/report/print-page': {},
  };
  const path = kind === 'csv' ? '../src/report/izin-report-document.ts' : '../src/rapor/pdf.ts';
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const exports: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  runInNewContext(transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText, {
    exports, process: { env: { EXPO_OS: 'android' } }, Uint8Array, Date,
    require: (name: string) => {
      assert.ok(name in modules, `Unexpected import: ${name}`);
      return modules[name];
    },
  });
  const run = () => kind === 'csv' ? exports.bagikanLaporanIzinCsv({}) : exports.downloadReport(1, 1, () => active);
  return { events, run, resolveWrite, rejectWrite, revoke: () => { active = false; } };
}

for (const kind of ['csv', 'rapor'] as const) {
  test(`${kind}: waits for the complete file before sharing`, async () => {
    const probe = documentExport(kind);
    const result = probe.run();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(probe.events, ['write-start']);
    probe.resolveWrite();
    await result;
    assert.ok(probe.events.indexOf('write-done') < probe.events.indexOf('share'));
  });

  test(`${kind}: write failure rejects export without opening sharing`, async () => {
    const probe = documentExport(kind);
    const failure = new Error('disk full');
    const result = probe.run();
    const rejected = assert.rejects(result, failure);
    await new Promise(resolve => setImmediate(resolve));
    probe.rejectWrite(failure);
    await rejected;
    assert.equal(probe.events.includes('share'), false);
  });
}

test('rapor: revoked access during file writing suppresses sharing and removes cache', async () => {
  const probe = documentExport('rapor');
  const result = probe.run();
  await new Promise(resolve => setImmediate(resolve));
  probe.revoke();
  probe.resolveWrite();
  await result;
  assert.deepEqual(probe.events, ['write-start', 'write-done', 'delete']);
});
