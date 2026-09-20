import 'react-native-gesture-handler' // must be first
import '#/platform/polyfills'

import {LogBox} from 'react-native'
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated'
import {registerRootComponent} from 'expo'

import App from '#/App'

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
})

if (process.env.NODE_ENV === 'test') {
  LogBox.ignoreAllLogs() // suppress all logs in tests
} else {
  LogBox.ignoreLogs([
    'Require cycle:',
    '[Reanimated] dependencies should only be used in web implementation.',
    /\[Reanimated\]/,
  ])
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
