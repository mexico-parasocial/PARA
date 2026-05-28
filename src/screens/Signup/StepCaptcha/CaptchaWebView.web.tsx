/* eslint-disable react-native-a11y/has-valid-accessibility-descriptors */
import {useCallback, useEffect, useState} from 'react'
import {Button, StyleSheet, Text, TextInput, View} from 'react-native'

// @ts-ignore web only, we will always redirect to the app on web (CORS)
const REDIRECT_HOST = new URL(window.location.href).host

export function CaptchaWebView({
  url,
  stateParam,
  onSuccess,
  onError,
}: {
  url: string
  stateParam: string
  onSuccess: (code: string) => void
  onError: (error: unknown) => void
}) {
  useEffect(() => {
    const timeout = setTimeout(() => {
      onError({
        errorMessage: 'User did not complete the captcha within 30 seconds',
      })
    }, 30e3)

    return () => {
      clearTimeout(timeout)
    }
  }, [onError])

  const onLoad = useCallback(() => {
    // @ts-ignore web
    const frame: HTMLIFrameElement = document.getElementById(
      'captcha-iframe',
    ) as HTMLIFrameElement

    try {
      // @ts-ignore web
      const href = frame?.contentWindow?.location.href
      if (!href) return
      const urlp = new URL(href)

      // This shouldn't happen with CORS protections, but for good measure
      if (urlp.host !== REDIRECT_HOST) return

      const code = urlp.searchParams.get('code')
      if (urlp.searchParams.get('state') !== stateParam || !code) {
        onError({error: 'Invalid state or code'})
        return
      }
      onSuccess(code)
    } catch (e: unknown) {
      // We don't actually want to record an error here, because this will happen quite a bit. We will only be able to
      // get hte href of the iframe if it's on our domain, so all the hcaptcha requests will throw here, although it's
      // harmless. Our other indicators of time-to-complete and back press should be more reliable in catching issues.
    }
  }, [stateParam, onSuccess, onError])

  const [devCode, setDevCode] = useState('')

  return (
    <View style={styles.container}>
      {__DEV__ && (
        <View style={styles.devFallback}>
          <Text style={{fontWeight: 'bold', marginBottom: 8}}>
            [DEV ONLY] Captcha blocked by iframe?
          </Text>
          <Button
            title="Open Captcha in New Tab"
            onPress={() => window.open(url, '_blank')}
          />
          <TextInput
            placeholder="Paste code here from redirect URL..."
            value={devCode}
            onChangeText={setDevCode}
            style={styles.devInput}
          />
          <Button
            title="Submit Dev Code"
            onPress={() => onSuccess(devCode || 'test-captcha')}
          />
        </View>
      )}
      <iframe
        src={url}
        style={styles.iframe}
        id="captcha-iframe"
        onLoad={onLoad}
        title="Captcha challenge"
        role="group"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  devFallback: {
    padding: 16,
    backgroundColor: '#ffd',
    marginBottom: 16,
    borderRadius: 8,
  },
  devInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginVertical: 8,
    borderRadius: 4,
  },
  iframe: {
    flex: 1,
    borderWidth: 0,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
})
