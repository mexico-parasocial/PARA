

let LocalAuthentication: typeof import('expo-local-authentication') | null = null

try {
  LocalAuthentication = require('expo-local-authentication')
} catch {
  // expo-local-authentication not installed; fall back to mock
}

export async function authenticateBiometric(): Promise<boolean> {
  if (LocalAuthentication) {
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

  // Fallback for dev / web / missing module
  return new Promise(resolve => setTimeout(() => resolve(true), 800))
}
