const {IOSConfig} = require('expo/config-plugins')

const createAppConfig = require('../../app.config')

const originalBuildEnvironment = process.env.EXPO_PUBLIC_ENV
const originalMapsKey = process.env.GOOGLE_MAPS_API_KEY
const originalIosMapsKey = process.env.GOOGLE_MAPS_IOS_API_KEY
const originalAndroidMapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY

beforeEach(() => {
  process.env.GOOGLE_MAPS_API_KEY = 'test-key'
  delete process.env.GOOGLE_MAPS_IOS_API_KEY
  delete process.env.GOOGLE_MAPS_ANDROID_API_KEY
})

afterEach(() => {
  for (const [key, value] of [
    ['GOOGLE_MAPS_API_KEY', originalMapsKey],
    ['GOOGLE_MAPS_IOS_API_KEY', originalIosMapsKey],
    ['GOOGLE_MAPS_ANDROID_API_KEY', originalAndroidMapsKey],
  ]) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  if (originalBuildEnvironment === undefined) {
    delete process.env.EXPO_PUBLIC_ENV
  } else {
    process.env.EXPO_PUBLIC_ENV = originalBuildEnvironment
  }
})

it.each([
  ['local development', undefined],
  ['development', 'development'],
  ['end-to-end testing', 'e2e'],
  ['TestFlight', 'testflight'],
  ['production', 'production'],
])(
  'supports tablets and sets parent device families for %s',
  (_name, environment) => {
    if (environment === undefined) {
      delete process.env.EXPO_PUBLIC_ENV
    } else {
      process.env.EXPO_PUBLIC_ENV = environment
    }

    const config = createAppConfig({name: 'Bluesky', slug: 'bluesky'}).expo

    expect(config.ios.supportsTablet).toBe(true)
    expect(
      IOSConfig.DeviceFamily.formatDeviceFamilies(
        IOSConfig.DeviceFamily.getDeviceFamilies(config),
      ),
    ).toBe('"1,2"')
    expect(config.ios.infoPlist.UISupportedInterfaceOrientations).toEqual([
      'UIInterfaceOrientationPortrait',
    ])
    expect(
      config.ios.infoPlist['UISupportedInterfaceOrientations~ipad'],
    ).toEqual([
      'UIInterfaceOrientationPortrait',
      'UIInterfaceOrientationPortraitUpsideDown',
      'UIInterfaceOrientationLandscapeLeft',
      'UIInterfaceOrientationLandscapeRight',
    ])
  },
)
