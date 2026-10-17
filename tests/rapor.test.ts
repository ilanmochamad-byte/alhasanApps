import assert from 'node:assert/strict';
import test from 'node:test';
import { gradeDraft, gradePayload, notificationTarget, requireReason, reportLinkTarget } from '../src/rapor/forms.ts';

test('Kosong tetap belum lengkap, nol sah, versi lama tetap dikirim', () => {
 const draft = gradeDraft([]);
 assert.throws(() => gradePayload(draft, 'draf'));
 draft[0].nilai = '0';
 assert.equal(gradePayload(draft, 'draf')[0].nilai, '0');
 assert.throws(() => gradePayload(draft, 'serahkan'));
 draft[1].nilai = '78'; draft[2].nilai = '92'; draft[0].version = 7;
 assert.equal(gradePayload(draft, 'serahkan')[0].version, 7);
 draft[0].nilai = '';
 assert.throws(() => gradePayload(draft, 'draf'), /0–100/);
});
test('Validasi angka/reason tidak meloloskan nilai tak sah atau alasan kosong', () => {
 for (const value of ['101', '-1', 'NaN', '1.234', '1e2']) assert.throws(() => gradePayload([{ komponen: 'Harian', nomor_harian: 1, nilai: value, catatan: '', version: 0 }], 'draf'));
 assert.throws(() => requireReason(' ', true));
 assert.throws(() => requireReason('a'.repeat(1001), false));
});
test('Push hanya penunjuk valid; data/nilai/tautan lain tidak dipakai', () => {
 assert.deepEqual(notificationTarget({ tipe: 'rapor', rapor_id: 9, url: 'https://evil.test', nilai: 99 }), { tipe: 'rapor', id: 9 });
 for (const id of [0, -1, {}, [], true, Number.MAX_SAFE_INTEGER + 1]) assert.equal(notificationTarget({ tipe: 'rapor', rapor_id: id }), null);
 assert.equal(notificationTarget({ tipe: 'unknown', rapor_id: 9 }), null);
 assert.deepEqual(notificationTarget({ tipe: 'v3_publikasi', publikasi_id: 3 }), { tipe: 'v3_publikasi', id: 3 });
 assert.deepEqual(notificationTarget({ tipe: 'izin', pengajuan_id: '4' }), { tipe: 'izin', id: 4 });
});

test('Deep-link native hanya skema/rute rapor sah; ID bertahan sebagai penunjuk', () => {
 assert.equal(reportLinkTarget('alhasanapps://rapor/19'), 19);
 assert.equal(reportLinkTarget('alhasanapps:///rapor/19'), 19);
 for (const url of ['https://evil.test/rapor/19','alhasanapps://rapor/0','alhasanapps://rapor/9007199254740993','alhasanapps://rapor/1/extra']) assert.equal(reportLinkTarget(url), null);
});
