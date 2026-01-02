import 'dotenv/config';
import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "TodoerApp",
  slug: "todoer-app",
  version: "1.0.0",
  orientation: "portrait",
  // Updated Icon Path
  icon: "./assets/images/Gemini_Generated_Image_xv7e0rxv7e0rxv7e.png",
  scheme: "todoerapp",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,

  ios: {
    supportsTablet: true,
  },

  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      // Set as foreground for Android adaptive icons
      foregroundImage: "./assets/images/Gemini_Generated_Image_xv7e0rxv7e0rxv7e.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },

  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        // Updated Splash Screen Path
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

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    githubToken: process.env.GITHUB_TOKEN || "",
    githubEndpoint:
      process.env.GITHUB_ENDPOINT ||
      "https://models.github.ai/inference",
    githubModel:
      process.env.GITHUB_MODEL || "openai/gpt-4o-mini",

      eas: {
        "projectId": "afc2c2f0-b8c1-4fc1-bf1b-6d2a539a3250"
      },
  },

});