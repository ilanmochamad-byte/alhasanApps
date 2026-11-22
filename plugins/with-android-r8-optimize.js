// Optimasi Android Google Play (GP-1, 21 November 2026).
//
// Template Expo SDK 57 / React Native 0.86 menulis
//   proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
// pada build type release. Berkas bawaan AGP `proguard-android.txt` memuat
// `-dontoptimize`, sehingga R8 hanya memangkas dan mengaburkan kode tanpa
// mengoptimalkannya. Plugin ini menggantinya dengan
// `proguard-android-optimize.txt` (aturan bawaan yang direkomendasikan Google
// untuk R8) setiap kali `expo prebuild` dijalankan, termasuk di EAS.
//
// Minify R8 dan resource shrinking sendiri diaktifkan oleh
// `expo-build-properties` (app.json). Plugin ini sengaja gagal keras bila pola
// template tidak ditemukan, agar perubahan template di masa depan tidak diam-diam
// membuat build kembali memakai `-dontoptimize`.
//
// Selain itu plugin menyematkan Android Gradle Plugin ke patch terbaru jalur
// 8.12 yang dipakai React Native 0.86 (template memakai 8.12.0). Google Play
// mengambil skor optimasi/obfuscation/shrinking dari `r8.json` hanya untuk
// "latest patch version of AGP 8.10 or higher" (contoh 8.10.1, bukan 8.10.0).
// Ini kenaikan patch, bukan mayor/minor; ubah AGP_PATCH hanya ke patch 8.12.x
// yang lebih baru setelah diuji.
//
// Rekomendasi Play untuk 1.9.1 (22 November 2026): "Penyingkatan resource yang
// dioptimalkan tidak diaktifkan". AGP 8.12+ menyediakan mode opt-in
// `android.r8.optimizedResourceShrinking=true` (bawaan sejak AGP 9.0): R8
// memangkas kode dan resource dalam satu analisis sehingga resource yang hanya
// dirujuk kode mati ikut terbuang. Properti ini hanya bekerja bersama
// `shrinkResources` (diaktifkan expo-build-properties di atas). Upgrade ke AGP 9
// tidak dilakukan karena React Native 0.86 terikat AGP 8.12.
const { withAppBuildGradle, withGradleProperties, withProjectBuildGradle } = require('expo/config-plugins');

const PROPERTI_RESOURCE_OPTIMAL = 'android.r8.optimizedResourceShrinking';

function aktifkanPenyingkatanResourceOptimal(items) {
  const lain = items.filter((item) => !(item.type === 'property' && item.key === PROPERTI_RESOURCE_OPTIMAL));
  return [...lain, { type: 'property', key: PROPERTI_RESOURCE_OPTIMAL, value: 'true' }];
}

const AGP_PATCH = '8.12.3';
const POLA_AGP = /classpath\(\s*['"]com\.android\.tools\.build:gradle(?::[^'"]*)?['"]\s*\)/g;
const AGP_BARU = `classpath('com.android.tools.build:gradle:${AGP_PATCH}')`;

function sematkanPatchAgp(contents) {
  const cocok = contents.match(POLA_AGP) || [];
  if (cocok.length !== 1) {
    throw new Error(
      `[with-android-r8-optimize] Diharapkan tepat satu classpath com.android.tools.build:gradle di android/build.gradle, ditemukan ${cocok.length}.`,
    );
  }
  return contents.replace(POLA_AGP, AGP_BARU);
}

const POLA_LAMA = /getDefaultProguardFile\(\s*["']proguard-android\.txt["']\s*\)/g;
const BARU = 'getDefaultProguardFile("proguard-android-optimize.txt")';

function terapkanProguardOptimize(contents) {
  if (contents.includes(BARU) && !POLA_LAMA.test(contents)) {
    return contents;
  }
  POLA_LAMA.lastIndex = 0;
  const jumlah = (contents.match(POLA_LAMA) || []).length;
  if (jumlah !== 1) {
    throw new Error(
      `[with-android-r8-optimize] Diharapkan tepat satu getDefaultProguardFile("proguard-android.txt") di android/app/build.gradle, ditemukan ${jumlah}. Periksa template prebuild.`,
    );
  }
  return contents.replace(POLA_LAMA, BARU);
}

const withAndroidR8Optimize = (config) => {
  config = withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('[with-android-r8-optimize] Hanya mendukung android/app/build.gradle (Groovy).');
    }
    cfg.modResults.contents = terapkanProguardOptimize(cfg.modResults.contents);
    return cfg;
  });
  config = withGradleProperties(config, (cfg) => {
    cfg.modResults = aktifkanPenyingkatanResourceOptimal(cfg.modResults);
    return cfg;
  });
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('[with-android-r8-optimize] Hanya mendukung android/build.gradle (Groovy).');
    }
    cfg.modResults.contents = sematkanPatchAgp(cfg.modResults.contents);
    return cfg;
  });
};

module.exports = withAndroidR8Optimize;
module.exports.terapkanProguardOptimize = terapkanProguardOptimize;
module.exports.sematkanPatchAgp = sematkanPatchAgp;
module.exports.AGP_PATCH = AGP_PATCH;
module.exports.aktifkanPenyingkatanResourceOptimal = aktifkanPenyingkatanResourceOptimal;
module.exports.PROPERTI_RESOURCE_OPTIMAL = PROPERTI_RESOURCE_OPTIMAL;
