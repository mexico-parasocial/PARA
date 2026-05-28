import {useRef, useState} from 'react'
import {ActivityIndicator, StyleSheet, TouchableOpacity,View} from 'react-native'
import {WebView, type WebViewMessageEvent} from 'react-native-webview'

import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'

interface ZkpProverWebViewProps {
  proverUrl: string
  onProofGenerated: (result: {
    success: boolean
    proof?: unknown
    publicSignals?: string[]
    commitment?: string
    error?: string
  }) => void
  onClose: () => void
}

export default function ZkpProverWebView({
  proverUrl,
  onProofGenerated,
  onClose,
}: ZkpProverWebViewProps) {
  const t = useTheme()
  const [status, setStatus] = useState('Loading prover...')
  const [loading, setLoading] = useState(true)
  const webViewRef = useRef<WebView>(null)

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data.success) {
        setStatus('Proof generated successfully')
        setLoading(false)
        onProofGenerated(data)
      } else {
        setStatus(`Error: ${data.error}`)
        setLoading(false)
        onProofGenerated(data)
      }
    } catch {
      // Ignore non-JSON messages
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeText, {color: t.palette.primary_500}]}>✕ Close</Text>
        </TouchableOpacity>
        <Text style={[styles.title, t.atoms.text]}>Privacy Proof</Text>
        <View style={styles.placeholder} />
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={t.palette.primary_500} />
          <Text style={[styles.statusText, t.atoms.text_contrast_medium]}>
            {status}
          </Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{uri: proverUrl}}
        onMessage={handleMessage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => {
          // The prover page will post a message when done, so we keep loading true
        }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        style={styles.webview}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: '#0a0a0f',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  placeholder: {
    width: 60,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,15,0.95)',
    zIndex: 10,
  },
  statusText: {
    marginTop: 16,
    fontSize: 14,
  },
  webview: {
    flex: 1,
  },
})
