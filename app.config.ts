import 'dotenv/config';
import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,

  /** App Identity */
  name: "TodoerApp",
  slug: "todoerapp",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "todoerapp",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,

  /** App Icons */
  icon: "./assets/images/Gemini_Generated_Image_xv7e0rxv7e0rxv7e.png",

  /** iOS */
  ios: {
    supportsTablet: true,
  },

  /** Android */
  android: {
    package: "com.yourcompany.todoerapp", // ✅ keep your final package name
    versionCode: 1,
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      // add permissions if needed
    ],
    adaptiveIcon: {
      foregroundImage: "./assets/images/Gemini_Generated_Image_xv7e0rxv7e0rxv7e.png",
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
        image: "./assets/images/Gemini_Generated_Image_xv7e0rxv7e0rxv7e.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
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
      projectId: "todoer-app",
    },
  },
});
