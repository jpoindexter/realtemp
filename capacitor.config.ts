import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'studio.theft.realtemp',
  appName: 'RealTemp',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
  },
}

export default config
