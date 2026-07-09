const { withAndroidStyles, withAppBuildGradle } = require('@expo/config-plugins');

/** Native Android splash = solid color only. AnimatedSplash is the branded logo. */
function withAndroidSolidSplash(config) {
  let next = withAndroidStyles(config, (cfg) => {
    const styles = cfg.modResults;
    const splash = styles.resources.style?.find((s) => s.$?.name === 'Theme.App.SplashScreen');
    if (splash?.item) {
      splash.item = splash.item.filter(
        (item) =>
          item.$?.name !== 'windowSplashScreenAnimatedIcon' &&
          item.$?.name !== 'android:windowSplashBehavior' &&
          item.$?.name !== 'android:windowSplashScreenBehavior',
      );
    }
    return cfg;
  });

  // Standalone debug APKs must ship an embedded bundle (no Metro on device).
  next = withAppBuildGradle(next, (cfg) => {
    if (!cfg.modResults.contents.includes('debuggableVariants = []')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /react\s*\{/,
        `react {
    debuggableVariants = []`,
      );
    }
    return cfg;
  });

  return next;
}

module.exports = withAndroidSolidSplash;
