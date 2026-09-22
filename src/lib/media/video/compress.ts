import {type ImagePickerAsset} from 'expo-image-picker'
import {compress, probe} from '@bsky.app/video-compressor'

import {SUPPORTED_MIME_TYPES, type SupportedMimeTypes} from '#/lib/constants'
import {type CompressedVideo} from './types'

const MIN_SIZE_FOR_COMPRESSION_BYTES = 25 * 1024 * 1024 // 25mb

export async function compressVideo(
  file: ImagePickerAsset,
  opts?: {
    signal?: AbortSignal
    onProgress?: (progress: number) => void
  },
): Promise<CompressedVideo> {
  const {onProgress, signal} = opts || {}

  if (file.mimeType === 'image/gif') {
    // let's hope they're small enough that they don't need compression!
    // this compression library doesn't support gifs
    // worst case - server rejects them. I think that's fine -sfn
    return {
      uri: file.uri,
      size: file.fileSize ?? -1,
      mimeType: 'image/gif',
      passthroughReason: 'gif',
    }
  }

  // Pre-check the threshold ourselves so we can label the skip in telemetry.
  const isAcceptableFormat = SUPPORTED_MIME_TYPES.includes(
    file.mimeType as SupportedMimeTypes,
  )
  if (
    isAcceptableFormat &&
    file.fileSize != null &&
    file.fileSize < MIN_SIZE_FOR_COMPRESSION_BYTES
  ) {
    return {
      uri: file.uri,
      size: file.fileSize,
      mimeType: file.mimeType ?? 'video/mp4',
      passthroughReason: 'below-byte-threshold',
    }
  }

  const result = await compress(
    file.uri,
    {
      targetBitrate: 3_000_000, // 3mbps
      maxSize: 1920,
    },
    {onProgress, signal},
  )

  if (result.mimeType) {
    return {
      uri: result.uri,
      size: result.size,
      mimeType: result.mimeType,
      passthroughReason: result.passthroughReason,
    }
  }

  const info = await probe(result.uri)

  return {uri: result.uri, size: info.fileSize, mimeType: info.mimeType}
}
