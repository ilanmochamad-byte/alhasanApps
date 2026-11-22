// Siklus hidup UIScene iOS (K-5 optimasi Android Google Play, 22 November 2026).
//
// Aplikasi yang dibangun dengan SDK iOS 27 wajib memakai siklus hidup berbasis
// scene; tanpa itu UIKit menghentikan aplikasi saat start dengan pesan
// "UIScene life cycle is required for apps built with this SDK"
// (https://developer.apple.com/documentation/uikit/transitioning-to-the-uikit-scene-based-life-cycle).
//
// Template prebuild Expo SDK 57 masih membuat jendela di AppDelegate tanpa
// manifest scene. Paket `expo` 57.0.33 sudah menyediakan `ExpoAppSceneDelegate`
// (membuat UIWindow dari UIWindowScene, memulai React Native, dan meneruskan
// URL/aktivitas/peristiwa siklus hidup ke AppDelegate dan RCTLinkingManager).
// Plugin ini menyusun proyek iOS sama seperti template SDK 58
// (expo-template-bare-minimum 58.0.35):
//   1. SceneDelegate.swift: `class SceneDelegate: ExpoAppSceneDelegate`.
//   2. Info.plist: UIApplicationSceneManifest satu scene, delegasi SceneDelegate.
//   3. AppDelegate.swift: mematuhi `ExpoReactNativeFactoryProvider` dan tidak lagi
//      membuat jendela/memulai React Native sendiri (dikerjakan SceneDelegate).
// Override Linking/Universal Links di AppDelegate dipertahankan; penerus scene
// Expo mencegah RCTLinkingManager diberi tahu dua kali.
//
// Plugin gagal keras bila pola template tidak ditemukan, agar perubahan template
// tidak diam-diam menghasilkan aplikasi yang crash saat start.
const fs = require('fs');
const path = require('path');
const {
  IOSConfig,
  withAppDelegate,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject,
} = require('expo/config-plugins');

const NAMA_BERKAS = 'SceneDelegate.swift';
const ISI_SCENE_DELEGATE = `internal import Expo

// Dibuat oleh plugins/with-ios-scene-lifecycle.js (siklus hidup UIScene, SDK iOS 27).
@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  // Extension point for config plugins.
}
`;

const MANIFEST_SCENE = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
      },
    ],
  },
};

const POLA_KELAS = /class AppDelegate: ExpoAppDelegate \{/;
const KELAS_BARU = 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {';
const POLA_JENDELA =
  /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n\s*withModuleName: "main",\n\s*in: window,\n\s*launchOptions: launchOptions\)\n#endif\n/;
const JENDELA_BARU =
  '    // The window is created and React Native is started by `SceneDelegate` under the\n' +
  '    // scene-based life cycle (required by the iOS 27 SDK).\n';

function ubahAppDelegate(contents) {
  if (contents.includes(KELAS_BARU) && !POLA_JENDELA.test(contents)) {
    return contents;
  }
  if (!POLA_KELAS.test(contents) || !POLA_JENDELA.test(contents)) {
    throw new Error(
      '[with-ios-scene-lifecycle] Pola AppDelegate.swift template SDK 57 tidak ditemukan. Periksa template prebuild sebelum memperbarui plugin.',
    );
  }
  return contents.replace(POLA_KELAS, KELAS_BARU).replace(POLA_JENDELA, JENDELA_BARU);
}

const withIosSceneLifecycle = (config) => {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = MANIFEST_SCENE;
    return cfg;
  });

  config = withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('[with-ios-scene-lifecycle] Hanya mendukung AppDelegate.swift.');
    }
    cfg.modResults.contents = ubahAppDelegate(cfg.modResults.contents);
    return cfg;
  });

  config = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const nama = IOSConfig.XcodeUtils.getProjectName(cfg.modRequest.projectRoot);
      const tujuan = path.join(cfg.modRequest.platformProjectRoot, nama, NAMA_BERKAS);
      fs.writeFileSync(tujuan, ISI_SCENE_DELEGATE);
      return cfg;
    },
  ]);

  return withXcodeProject(config, (cfg) => {
    const nama = IOSConfig.XcodeUtils.getProjectName(cfg.modRequest.projectRoot);
    const jalur = `${nama}/${NAMA_BERKAS}`;
    if (!cfg.modResults.hasFile(jalur)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: jalur,
        groupName: nama,
        project: cfg.modResults,
      });
    }
    return cfg;
  });
};

module.exports = withIosSceneLifecycle;
module.exports.ubahAppDelegate = ubahAppDelegate;
module.exports.MANIFEST_SCENE = MANIFEST_SCENE;
module.exports.ISI_SCENE_DELEGATE = ISI_SCENE_DELEGATE;
