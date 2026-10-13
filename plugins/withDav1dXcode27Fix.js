const {withPodfile} = require('expo/config-plugins')

const MARKER = '# withDav1dXcode27Fix'

/**
 * Xcode 27's clang promotes `-Wincompatible-pointer-types` to an error, and
 * libdav1d (pulled in by expo-image via libavif/libdav1d) trips it in
 * `src/thread_task.c` ("incompatible pointer types passing 'uint8_t[3][4096]'").
 * The pod is third-party and not ours to patch, so downgrade the diagnostic back
 * to a warning for that one target at `pod install` time.
 *
 * Remove once libdav1d / libavif ship a fixed release.
 */
const SNIPPET = `    ${MARKER}
    installer.pods_project.targets.each do |target|
      next unless target.name == 'libdav1d'
      target.build_configurations.each do |build_config|
        flags = build_config.build_settings['OTHER_CFLAGS'] || ['$(inherited)']
        flags = [flags] if flags.is_a?(String)
        flags << '-Wno-error=incompatible-pointer-types'
        build_config.build_settings['OTHER_CFLAGS'] = flags
      end
    end
`

module.exports = function withDav1dXcode27Fix(config) {
  return withPodfile(config, exportedConfig => {
    const contents = exportedConfig.modResults.contents
    if (typeof contents !== 'string' || contents.includes(MARKER)) {
      return exportedConfig
    }
    const anchor = /^(\s*post_install do \|installer\|\n)/m
    if (!anchor.test(contents)) {
      throw new Error(
        'withDav1dXcode27Fix: could not find `post_install do |installer|` in the generated Podfile',
      )
    }
    exportedConfig.modResults.contents = contents.replace(
      anchor,
      `$1${SNIPPET}`,
    )
    return exportedConfig
  })
}
