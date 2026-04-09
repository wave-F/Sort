import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.habby.webviewsafetytest',
  appName: 'WebViewSafetyTest',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  ios: {
    // 推荐的 iOS 配置
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: false,
    // 禁用 bouncing 效果
    limitsNavigationsToAppBoundDomains: true
  },
  plugins: {
    // 如果需要添加插件配置
  }
};

export default config;
