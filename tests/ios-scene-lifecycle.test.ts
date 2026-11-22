// Siklus hidup UIScene iOS (K-5). Menguji config plugin yang menyusun
// SceneDelegate, manifest scene, dan AppDelegate seperti template Expo SDK 58.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { ubahAppDelegate, MANIFEST_SCENE, ISI_SCENE_DELEGATE } = require('../plugins/with-ios-scene-lifecycle.js');

// Potongan AppDelegate.swift persis seperti prebuild Expo SDK 57 (expo 57.0.33).
const TEMPLATE_57 = `@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }
}`;

test('AppDelegate menjadi penyedia factory dan tidak lagi membuat jendela sendiri', () => {
  const hasil = ubahAppDelegate(TEMPLATE_57);
  assert.match(hasil, /class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider \{/);
  assert.doesNotMatch(hasil, /UIWindow\(frame:/);
  assert.doesNotMatch(hasil, /startReactNative/);
  // Factory tetap dibuat di didFinishLaunching (dibaca ExpoAppSceneDelegate).
  assert.match(hasil, /reactNativeFactory = factory/);
  // Override Linking dipertahankan (penerus scene Expo mencegah notifikasi ganda).
  assert.match(hasil, /RCTLinkingManager\.application\(app, open: url/);
});

test('idempoten dan gagal keras bila pola template berubah', () => {
  const sekali = ubahAppDelegate(TEMPLATE_57);
  assert.equal(ubahAppDelegate(sekali), sekali);
  assert.throws(() => ubahAppDelegate('class AppDelegate: NSObject {}'), /tidak ditemukan/);
});

test('manifest scene satu jendela dengan SceneDelegate turunan ExpoAppSceneDelegate', () => {
  assert.equal(MANIFEST_SCENE.UIApplicationSupportsMultipleScenes, false);
  const [konfigurasi] = MANIFEST_SCENE.UISceneConfigurations.UIWindowSceneSessionRoleApplication;
  assert.equal(konfigurasi.UISceneDelegateClassName, '$(PRODUCT_MODULE_NAME).SceneDelegate');
  assert.match(ISI_SCENE_DELEGATE, /@objc\(SceneDelegate\)\nclass SceneDelegate: ExpoAppSceneDelegate \{/);
});

test('app.json mendaftarkan plugin UIScene dan expo mendukung ExpoAppSceneDelegate', () => {
  const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
  assert.ok(app.expo.plugins.includes('./plugins/with-ios-scene-lifecycle'));
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
  const [, minor, patch] = lock.packages['node_modules/expo'].version.split('.').map(Number);
  assert.ok(minor > 0 || patch >= 33, 'expo >= 57.0.33 menyediakan ExpoAppSceneDelegate');
});
