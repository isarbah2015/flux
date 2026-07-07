const { withAppBuildGradle } = require('@expo/config-plugins');

/** Use the NDK already installed on this machine (avoids a ~1GB download on low disk). */
const NDK_VERSION = '30.0.14904198';

function withNdkVersion(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language === 'groovy') {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /ndkVersion\s+rootProject\.ext\.ndkVersion/,
        `ndkVersion "${NDK_VERSION}"`,
      );
    }
    return cfg;
  });
}

module.exports = withNdkVersion;
