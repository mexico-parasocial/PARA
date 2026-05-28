const {withProjectBuildGradle} = require('expo/config-plugins')

const jitpackRepositoryPatterns = [
  /[ \t]*maven\s*\{\s*url\s+['"]https:\/\/www\.jitpack\.io['"]\s*\}[ \t]*\n?/g,
  /[ \t]*maven\s*\(\s*['"]https:\/\/www\.jitpack\.io['"]\s*\)[ \t]*\n?/g,
]

module.exports = function withAndroidNoJitpackPlugin(config) {
  return withProjectBuildGradle(config, config => {
    for (const pattern of jitpackRepositoryPatterns) {
      config.modResults.contents = config.modResults.contents.replace(
        pattern,
        '',
      )
    }

    return config
  })
}
