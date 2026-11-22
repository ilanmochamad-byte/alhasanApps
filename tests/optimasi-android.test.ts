// Optimasi Android Google Play (GP-1). Menguji config plugin yang menggantikan
// `proguard-android.txt` (memuat -dontoptimize) dengan
// `proguard-android-optimize.txt` pada build release hasil `expo prebuild`.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  terapkanProguardOptimize,
  sematkanPatchAgp,
  AGP_PATCH,
  aktifkanPenyingkatanResourceOptimal,
  PROPERTI_RESOURCE_OPTIMAL,
} = require('../plugins/with-android-r8-optimize.js');

// Potongan android/build.gradle template prebuild (AGP versi dari plugin RN).
const TEMPLATE_ROOT = `buildscript {
  repositories {
    google()
    mavenCentral()
  }
  dependencies {
    classpath('com.android.tools.build:gradle')
    classpath('com.facebook.react:react-native-gradle-plugin')
    classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')
  }
}`;

test('AGP disematkan ke patch terbaru 8.12 (bukan mayor/minor baru), idempoten', () => {
  assert.match(AGP_PATCH, /^8\.12\.\d+$/);
  assert.notEqual(AGP_PATCH, '8.12.0');
  const hasil = sematkanPatchAgp(TEMPLATE_ROOT);
  assert.ok(hasil.includes(`classpath('com.android.tools.build:gradle:${AGP_PATCH}')`));
  assert.ok(hasil.includes("classpath('com.facebook.react:react-native-gradle-plugin')"));
  assert.equal(sematkanPatchAgp(hasil), hasil);
  assert.throws(() => sematkanPatchAgp('buildscript { }'), /ditemukan 0/);
});

// Potongan blok release persis seperti template prebuild Expo SDK 57 / RN 0.86.
const TEMPLATE_RELEASE = `    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            def enableShrinkResources = findProperty('android.enableShrinkResourcesInReleaseBuilds') ?: 'false'
            shrinkResources enableShrinkResources.toBoolean()
            minifyEnabled enableMinifyInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }`;

test('template release diganti ke proguard-android-optimize.txt tepat sekali', () => {
  const hasil = terapkanProguardOptimize(TEMPLATE_RELEASE);
  assert.match(hasil, /getDefaultProguardFile\("proguard-android-optimize\.txt"\), "proguard-rules\.pro"/);
  assert.doesNotMatch(hasil, /proguard-android\.txt/);
  assert.equal(hasil.replace('proguard-android-optimize.txt', 'proguard-android.txt'), TEMPLATE_RELEASE);
});

test('idempoten: prebuild berulang tidak mengubah hasil yang sudah benar', () => {
  const sekali = terapkanProguardOptimize(TEMPLATE_RELEASE);
  assert.equal(terapkanProguardOptimize(sekali), sekali);
});

test('gagal keras bila pola template tidak ada atau ganda', () => {
  assert.throws(() => terapkanProguardOptimize('android { buildTypes { release { } } }'), /ditemukan 0/);
  const ganda = `${TEMPLATE_RELEASE}\n${TEMPLATE_RELEASE}`;
  assert.throws(() => terapkanProguardOptimize(ganda), /ditemukan 2/);
});

test('app.json mengaktifkan minify dan shrink release lewat expo-build-properties dan plugin lokal', () => {
  const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
  const plugins: unknown[] = app.expo.plugins;
  const ebp = plugins.find((p) => Array.isArray(p) && p[0] === 'expo-build-properties') as
    | [string, { android?: Record<string, unknown> }]
    | undefined;
  assert.ok(ebp, 'expo-build-properties terdaftar');
  assert.equal(ebp[1].android?.enableMinifyInReleaseBuilds, true);
  assert.equal(ebp[1].android?.enableShrinkResourcesInReleaseBuilds, true);
  assert.ok(plugins.includes('./plugins/with-android-r8-optimize'), 'plugin optimize terdaftar');
  // Tidak boleh ada sakelar yang mematikan optimasi/obfuscation atau melonggarkan transport.
  const aturan = String(ebp[1].android?.extraProguardRules ?? '');
  assert.doesNotMatch(aturan, /-dontobfuscate|-dontoptimize|-dontshrink|-keep class \*\*/);
  assert.notEqual(ebp[1].android?.usesCleartextTraffic, true);
});

test('optimized resource shrinking diaktifkan tepat satu kali di gradle.properties, idempoten', () => {
  assert.equal(PROPERTI_RESOURCE_OPTIMAL, 'android.r8.optimizedResourceShrinking');
  const awal = [
    { type: 'comment', value: 'template' },
    { type: 'property', key: 'android.enableShrinkResourcesInReleaseBuilds', value: 'true' },
    { type: 'property', key: PROPERTI_RESOURCE_OPTIMAL, value: 'false' },
  ];
  const hasil = aktifkanPenyingkatanResourceOptimal(awal);
  const cocok = hasil.filter((i: { key?: string }) => i.key === PROPERTI_RESOURCE_OPTIMAL);
  assert.deepEqual(cocok, [{ type: 'property', key: PROPERTI_RESOURCE_OPTIMAL, value: 'true' }]);
  assert.ok(hasil.some((i: { key?: string; value?: string }) => i.key === 'android.enableShrinkResourcesInReleaseBuilds' && i.value === 'true'));
  assert.equal(hasil.length, 3);
  assert.deepEqual(aktifkanPenyingkatanResourceOptimal(hasil), hasil);
});
