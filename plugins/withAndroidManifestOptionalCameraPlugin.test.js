jest.mock('expo/config-plugins', () => ({
  withAndroidManifest: (config, action) => action(config),
}))

const withOptionalCamera = require('./withAndroidManifestOptionalCameraPlugin')

it('makes camera features optional without duplicating existing declarations', () => {
  const config = {
    modResults: {
      manifest: {
        'uses-feature': [
          {
            $: {
              'android:name': 'android.hardware.camera',
              'android:required': 'true',
            },
          },
          {$: {'android:name': 'android.hardware.location'}},
        ],
      },
    },
  }

  withOptionalCamera(config)
  withOptionalCamera(config)
  expect(config.modResults.manifest['uses-feature']).toEqual([
    {
      $: {
        'android:name': 'android.hardware.camera',
        'android:required': 'false',
      },
    },
    {$: {'android:name': 'android.hardware.location'}},
    {
      $: {
        'android:name': 'android.hardware.camera.autofocus',
        'android:required': 'false',
      },
    },
  ])
})
