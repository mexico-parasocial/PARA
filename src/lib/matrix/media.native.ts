import uuid from 'react-native-uuid'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'

import {matrixMediaUrl, safeMatrixFilename} from './media-url'

/** Explicit user action from the WebView; the token stays on the native side. */
export async function shareMatrixMedia(input: {
  homeServer: string
  accessToken: string
  mxcUrl: string
  filename: string
}): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is unavailable on this device')
  }
  const url = matrixMediaUrl(input.homeServer, input.mxcUrl)
  const cache = FileSystem.cacheDirectory
  if (!cache) throw new Error('No cache directory for Matrix media')
  const path = `${cache}matrix-${uuid.v4()}-${safeMatrixFilename(input.filename)}`
  try {
    const result = await FileSystem.downloadAsync(url, path, {
      headers: {Authorization: `Bearer ${input.accessToken}`},
    })
    if (result.status !== 200) {
      throw new Error(`Matrix media download failed: ${result.status}`)
    }
    await Sharing.shareAsync(result.uri)
  } finally {
    await FileSystem.deleteAsync(path, {idempotent: true}).catch(() => {})
  }
}
