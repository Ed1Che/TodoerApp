// services/config.ts
import Constants from 'expo-constants';

interface AppConfig {
  githubToken: string;
  githubEndpoint: string;
  githubModel: string;
}

/**
 * Retrieves configuration from Expo Constants
 * Variables are loaded from app.config.ts which reads from .env
 */
function getConfig(): AppConfig {
  const extra = Constants.expoConfig?.extra;

  const config = {
    githubToken: extra?.githubToken || '',
    githubEndpoint: extra?.githubEndpoint || 'https://models.github.ai/inference',
    githubModel: extra?.githubModel || 'openai/gpt-4o-mini',
  };

  // Development-only validation
  if (__DEV__) {
    validateConfig(config);
  }

  return config;
}

/**
 * Validates configuration and provides helpful error messages
 */
function validateConfig(config: AppConfig): void {
  const issues: string[] = [];

  if (!config.githubToken) {
    issues.push('❌ GITHUB_TOKEN is not set');
    issues.push('   Add GITHUB_TOKEN to your .env file');
  }

  if (!config.githubEndpoint) {
    issues.push('⚠️ GITHUB_ENDPOINT is not set, using default');
  }

  if (!config.githubModel) {
    issues.push('⚠️ GITHUB_MODEL is not set, using default');
  }

  if (issues.length > 0) {
    console.warn('\n⚠️ Configuration Issues:\n' + issues.join('\n'));
    console.warn('\nTo fix:');
    console.warn('1. Create a .env file in your project root');
    console.warn('2. Add: GITHUB_TOKEN=your_token_here');
    console.warn('3. Restart: npx expo start --clear\n');
  } else {
    console.log('✅ All environment variables loaded successfully');
  }
}

/**
 * Main configuration object
 */
export const config = getConfig();
