Pod::Spec.new do |s|
  s.name           = 'BottomSheet'
  s.version        = '1.0.0'
  s.summary        = 'A bottom sheet for use in Bluesky'
  s.description    = 'A bottom sheet for use in Bluesky'
  s.author         = ''
  s.homepage       = 'https://github.com/bluesky-social/social-app'
  s.platforms      = { :ios => '15.0', :tvos => '15.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # RN 0.81: RCTSurfaceTouchHandler lives in the React-RCTFabric module, which
  # is not visible through ExpoModulesCore alone on this version. Upstream is on
  # RN 0.86 where it resolves implicitly; drop this when we catch up.
  s.dependency 'React-RCTFabric'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
