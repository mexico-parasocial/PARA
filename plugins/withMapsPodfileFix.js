const {withPodfile} = require('expo/config-plugins')

/**
 * The `react-native-maps` Expo plugin (older templates) can emit
 * `pod 'react-native-google-maps', ...` into ios/Podfile, but the installed
 * `react-native-maps` package only ships `react-native-maps.podspec`, so
 * `pod install` fails with "No podspec found for `react-native-google-maps`".
 *
 * This mod rewrites the stale pod name at prebuild time so the fix survives
 * `expo prebuild --clean` (hand-editing ios/Podfile does not).
 */
module.exports = function withMapsPodfileFix(config) {
  return withPodfile(config, exportedConfig => {
    const contents = exportedConfig.modResults.contents
    if (typeof contents === 'string' && contents.includes('react-native-google-maps')) {
      exportedConfig.modResults.contents = contents.replaceAll(
        "'react-native-google-maps'",
        "'react-native-maps'",
      )
    }
    return exportedConfig
  })
}
