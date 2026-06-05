import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.khayatpro.maroc.app',
  appName: 'KhayatPro',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email", "https://www.googleapis.com/auth/drive.appdata", "https://www.googleapis.com/auth/drive.file"],
      clientId: "588657095755-v3aah0ci4kh311rmc0r91mmleo0j1j4m.apps.googleusercontent.com",
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
