const {withXcodeProject} = require('expo/config-plugins')
const path = require('path')
const fs = require('fs')

const FILES = ['AppDelegate.swift', 'ViewController.swift']

const withFiles = (config, {targetName}) => {
  return withXcodeProject(config, config => {
    const basePath = path.join(
      config.modRequest.projectRoot,
      'modules',
      targetName,
    )

    for (const file of FILES) {
      const sourcePath = path.join(basePath, file)
      const targetPath = path.join(
        config.modRequest.platformProjectRoot,
        targetName,
        file,
      )

      fs.mkdirSync(path.dirname(targetPath), {recursive: true})
      fs.copyFileSync(sourcePath, targetPath)
    }

    const imagesBasePath = path.join(basePath, 'Images.xcassets')
    const imagesTargetPath = path.join(
      config.modRequest.platformProjectRoot,
      targetName,
      'Images.xcassets',
    )
    fs.cpSync(imagesBasePath, imagesTargetPath, {recursive: true})

    // Create Supporting/Expo.plist for the App Clip target.
    // Expo's base mods expect this file to exist for every target that has an AppDelegate.
    const projectName = config.modRequest.projectName
    const mainExpoPlist = path.join(
      config.modRequest.platformProjectRoot,
      projectName,
      'Supporting',
      'Expo.plist',
    )
    const clipSupportingDir = path.join(
      config.modRequest.platformProjectRoot,
      targetName,
      'Supporting',
    )
    const clipExpoPlist = path.join(clipSupportingDir, 'Expo.plist')

    fs.mkdirSync(clipSupportingDir, {recursive: true})
    if (fs.existsSync(mainExpoPlist)) {
      fs.copyFileSync(mainExpoPlist, clipExpoPlist)
    } else {
      // Fallback: create a minimal Expo.plist
      fs.writeFileSync(
        clipExpoPlist,
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>EXUpdatesCheckOnLaunch</key>
    <string>NEVER</string>
    <key>EXUpdatesEnabled</key>
    <false/>
  </dict>
</plist>
`,
      )
    }

    return config
  })
}

module.exports = {withFiles}
