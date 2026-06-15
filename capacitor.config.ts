import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cl.guias.flete',
  appName: 'Guías de Flete',
  webDir: 'dist',
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      backgroundColor: '#1a56db',
    },
    StatusBar: {
      backgroundColor: '#0f172a',
      style: 'LIGHT',
    },
  },
};

export default config;
