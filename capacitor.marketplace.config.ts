import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eduai.marketplace',
  appName: 'EduAI Marketplace',
  webDir: 'dist',
  server: {
    url: 'https://portal.eduai.co.ke/?view=marketplace',
    allowNavigation: [
      'portal.eduai.co.ke',
      'portal.edual.co.ke',
      '*.eduai.co.ke',
      '*.edual.co.ke',
      'eduai.co.ke',
      'edual.co.ke'
    ]
  }
};

export default config;
