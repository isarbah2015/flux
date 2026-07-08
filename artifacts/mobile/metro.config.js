const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

const useNativeGoogle =
  process.env.FLUX_NATIVE_BUILD === '1' || process.env.EAS_BUILD === 'true';

if (!useNativeGoogle) {
  const stubPath = path.resolve(projectRoot, 'lib/google-sign-in-stub.ts');
  const originalResolveRequest = config.resolver.resolveRequest;

  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === '@react-native-google-signin/google-signin') {
      return { filePath: stubPath, type: 'sourceFile' };
    }
    if (originalResolveRequest) {
      return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
