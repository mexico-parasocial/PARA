

let LocalAuthentication: typeof import('expo-local-authentication') | null = null

try {
  LocalAuthentication = require('expo-local-authentication')
} catch {
  // expo-local-authentication not installed; handled below
}

export async function authenticateBiometric(): Promise<boolean> {
  if (!LocalAuthentication) {
    // Fail closed: without the platform module there is no way to actually
    // verify the user. Dev builds get a pass so simulator work isn't blocked.
    return __DEV__
  }

  const hasHardware = await LocalAuthentication.hasHardwareAsync()
  if (!hasHardware) return false

  const enrolled = await LocalAuthentication.isEnrolledAsync()
  if (!enrolled) return false

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to access your identity wallet',
    fallbackLabel: 'Use passcode',
  })
  return result.success
}
