/* oxlint-disable import/no-nodejs-modules -- Expo config plugins run in Node. */
const {withDangerousMod} = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

const SOURCE_DIRECTORY = 'modules/TrendingTopicsWidget'
const ANDROID_WIDGET_INFO_FILE = 'trending_topics_widget_info.xml'
const ANDROID_PREVIEW_LAYOUT = '@layout/trending_topics_widget_preview'

/**
 * Add an Android picker preview after expo-widgets generates its provider.
 * Mods run in reverse order, so register this before `expo-widgets`.
 */
module.exports = function withTrendingWidget(config) {
  config = withAndroidPreview(config)
  return config
}

/**
 * Copies our preview resources into the project and adds
 * `android:previewLayout` to the widget info.
 */
function withAndroidPreview(config) {
  return withDangerousMod(config, [
    'android',
    config => {
      const resDirectory = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res',
      )
      fs.cpSync(
        path.join(
          config.modRequest.projectRoot,
          SOURCE_DIRECTORY,
          'android/res',
        ),
        resDirectory,
        {recursive: true},
      )

      const widgetInfoPath = path.join(
        resDirectory,
        'xml',
        ANDROID_WIDGET_INFO_FILE,
      )
      if (!fs.existsSync(widgetInfoPath)) {
        throw new Error(
          `withTrendingWidget: ${ANDROID_WIDGET_INFO_FILE} not found. Is this plugin listed before expo-widgets?`,
        )
      }
      const widgetInfo = fs.readFileSync(widgetInfoPath, 'utf8')
      if (!widgetInfo.includes('android:previewLayout')) {
        fs.writeFileSync(
          widgetInfoPath,
          widgetInfo.replace(
            '<appwidget-provider ',
            `<appwidget-provider android:previewLayout="${ANDROID_PREVIEW_LAYOUT}" `,
          ),
        )
      }
      return config
    },
  ])
}
