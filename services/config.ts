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
    issues.push('   Add EXPO_PUBLIC_GITHUB_TOKEN to your .env file');
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
    console.warn('2. Add: EXPO_PUBLIC_GITHUB_TOKEN=your_token_here');
    console.warn('3. Restart: npx expo start --clear\n');
  } else {
    console.log('✅ All environment variables loaded successfully');
  }
}

/**
 * Main configuration object
 */
export const config = getConfig();

/**
 * Convenience exports for individual config values
 */
export const githubToken = config.githubToken;
export const githubEndpoint = config.githubEndpoint;
export const githubModel = config.githubModel;

/**
 * Check if all required configuration is present
 */
export function isConfigured(): boolean {
  return !!(config.githubToken && config.githubEndpoint && config.githubModel);
}

/**
 * Get detailed configuration status
 */
export function getConfigStatus() {
  return {
    isConfigured: isConfigured(),
    hasToken: !!config.githubToken,
    hasEndpoint: !!config.githubEndpoint,
    hasModel: !!config.githubModel,
    tokenPreview: config.githubToken 
      ? `${config.githubToken.slice(0, 4)}...${config.githubToken.slice(-4)}`
      : 'Not Set',
  };
}

/**
 * Get environment type
 */
export function getEnvironment(): 'development' | 'production' {
  return __DEV__ ? 'development' : 'production';
}

/**
 * Get API configuration with environment-specific settings
 */
export function getAPIConfig() {
  const isDevelopment = __DEV__;
  
  return {
    token: config.githubToken,
    endpoint: config.githubEndpoint,
    model: config.githubModel,
    timeout: isDevelopment ? 30000 : 10000,
    retries: isDevelopment ? 1 : 3,
    logErrors: isDevelopment,
  };
}

/**
 * Test and display configuration (for debugging)
 */
export function displayConfig(): void {
  console.log('\n=== App Configuration ===');
  console.log('Environment:', getEnvironment());
  console.log('Token:', config.githubToken ? '✅ Set' : '❌ Not Set');
  console.log('Endpoint:', config.githubEndpoint);
  console.log('Model:', config.githubModel);
  console.log('========================\n');
}
