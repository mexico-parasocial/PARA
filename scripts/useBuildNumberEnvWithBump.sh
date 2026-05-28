#!/bin/bash
if ! command -v eas &> /dev/null; then
  echo "eas command not found, using default version"
  BSKY_IOS_BUILD_NUMBER=1
  BSKY_ANDROID_VERSION_CODE=1
else
  outputIos=$(eas build:version:get -p ios)
  outputAndroid=$(eas build:version:get -p android)
  currentIosVersion=${outputIos#*buildNumber - }
  currentAndroidVersion=${outputAndroid#*versionCode - }

  BSKY_IOS_BUILD_NUMBER=$((currentIosVersion+1))
  BSKY_ANDROID_VERSION_CODE=$((currentAndroidVersion+1))
fi

bash -c "BSKY_IOS_BUILD_NUMBER=$BSKY_IOS_BUILD_NUMBER BSKY_ANDROID_VERSION_CODE=$BSKY_ANDROID_VERSION_CODE $*"

