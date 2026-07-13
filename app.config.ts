import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,

  /** App Identity */
  name: "TodoerApp",
  slug: "todoer-app",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "todoerapp",
  userInterfaceStyle: "automatic",

  /** App Icons */
  icon: "./assets/images/app-icon.png",

  /** iOS */
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.yourcompany.todoerapp", // ✅ keep your final bundle identifier
  },

  /** Android */
  android: {
    package: "com.yourcompany.todoerapp", // ✅ keep your final package name
    versionCode: 1,
    predictiveBackGestureEnabled: false,
    permissions: [
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.VIBRATE"
    ],
    adaptiveIcon: {
      foregroundImage: "./assets/images/app-icon.png",
      backgroundColor: "#E6F4FE",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
  },

  /** Web */
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  /** Plugins */
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/app-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    "@react-native-community/datetimepicker",
    "expo-font",
    "expo-image",
    "expo-secure-store",
  ],

  /** Experiments */
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  /** Extra / Env */
  extra: {
    githubToken: process.env.GITHUB_TOKEN || "",
    githubEndpoint:
      process.env.GITHUB_ENDPOINT ||
      "https://models.github.ai/inference",
    githubModel:
      process.env.GITHUB_MODEL || "openai/gpt-4o-mini",

    eas: {
        projectId: "afc2c2f0-b8c1-4fc1-bf1b-6d2a539a3250"
      }
  },

   updates: {
    url: "https://u.expo.dev/afc2c2f0-b8c1-4fc1-bf1b-6d2a539a3250"
  },
  runtimeVersion: {
    policy: "appVersion"
  }
});
