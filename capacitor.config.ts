import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eduai.academic',
  appName: 'EduAi Automation',
  webDir: 'dist',
  server: {
    url: 'https://portal.eduai.co.ke',
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
