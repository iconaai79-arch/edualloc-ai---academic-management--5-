import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eduai.academic',
  appName: 'EduAi Academic',
  webDir: 'dist',
  server: {
    url: 'https://portal.eduai.co.ke',
    allowNavigation: ['portal.eduai.co.ke']
  }
};

export default config;
