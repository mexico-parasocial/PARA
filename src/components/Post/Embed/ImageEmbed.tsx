import {type Component, useRef} from 'react'
import {InteractionManager, View} from 'react-native'
import {type AnimatedRef} from 'react-native-reanimated'
import {Image} from 'expo-image'

import {atoms as a, tokens} from '#/alf'
import {AutoSizedImage} from '#/components/images/AutoSizedImage'
import {Gallery} from '#/components/images/Gallery/index'
import {ImageLayoutGrid} from '#/components/images/ImageLayoutGrid'
import {useLightboxControls} from '#/components/Lightbox/state'
import {type Dimensions} from '#/components/Lightbox/types'
import {ImageContextMenu} from '#/components/Post/Embed/ImageContextMenu'
import {PostEmbedViewContext} from '#/components/Post/Embed/types'
import {useAnalytics} from '#/analytics'
import {type EmbedType} from '#/types/bsky/post'
import {type CommonProps} from './types'

export function ImageEmbed({
  embed,
  ...rest
}: CommonProps & {
  embed: EmbedType<'images'>
}) {
  const ax = useAnalytics()
  const {openLightbox} = useLightboxControls()
  const {images} = embed.view
  const galleryEnabled = ax.features.enabled(ax.features.PostGalleryEmbedEnable)

  // Captured from AutoSizedImage so the peek-commit handler can reuse the same
  // ref + dims that a tap would — keeps the lightbox's return animation intact.
  const singleContainerRef = useRef<AnimatedRef<View> | null>(null)
  const singleDimsRef = useRef<Dimensions | null>(null)

  if (images.length > 0) {
    const items = images.map(img => ({
      uri: img.fullsize,
      thumbUri: img.thumb,
      alt: img.alt,
      dimensions: img.aspectRatio ?? null,
    }))
    const onPress = (
      index: number,
      refs: AnimatedRef<View>[],
      fetchedDims: (Dimensions | null)[],
    ) => {
      openLightbox({
        images: items.map((item, i) => ({
          ...item,
          thumbRect: null,
          thumbRef: refs[i]
            ? (refs[i] as unknown as AnimatedRef<Component>)
            : null,
          thumbDimensions: fetchedDims[i] ?? null,
          thumbBorderRadius: tokens.borderRadius.md,
          type: 'image',
        })),
        index,
      })
    }
    const onPressIn = (_: number) => {
      InteractionManager.runAfterInteractions(() => {
        void Image.prefetch(
          items.map(i => i.uri),
          'memory',
        ).catch(() => undefined)
      })
    }

    if (images.length === 1) {
      const image = images[0]
      const aspect =
        image.aspectRatio && image.aspectRatio.height > 0
          ? image.aspectRatio.width / image.aspectRatio.height
          : undefined
      const openFromSingle = () => {
        if (singleContainerRef.current) {
          onPress(0, [singleContainerRef.current], [singleDimsRef.current])
        }
      }
      return (
        <View style={[a.mt_sm, rest.style]}>
          <ImageContextMenu
            fullsizeUri={image.fullsize}
            thumbUri={image.thumb}
            aspectRatio={aspect}
            borderRadius={tokens.borderRadius.md}
            onPreviewPress={openFromSingle}>
            <AutoSizedImage
              crop={
                rest.viewContext === PostEmbedViewContext.ThreadHighlighted
                  ? 'none'
                  : rest.viewContext ===
                      PostEmbedViewContext.FeedEmbedRecordWithMedia
                    ? 'square'
                    : 'constrained'
              }
              image={image}
              onContainerRef={ref => {
                singleContainerRef.current = ref
              }}
              onDimsChange={dims => {
                singleDimsRef.current = dims
              }}
              onPress={(containerRef, dims) =>
                onPress(0, [containerRef], [dims])
              }
              onPressIn={() => onPressIn(0)}
              hideBadge={
                rest.viewContext ===
                PostEmbedViewContext.FeedEmbedRecordWithMedia
              }
            />
          </ImageContextMenu>
        </View>
      )
    }

    if (galleryEnabled) {
      return (
        <View style={[a.mt_sm, rest.style]}>
          <Gallery
            images={images}
            onPress={onPress}
            onPressIn={onPressIn}
            viewContext={rest.viewContext}
          />
        </View>
      )
    }

    return (
      <View style={[a.mt_sm, rest.style]}>
        <ImageLayoutGrid
          images={images}
          onPress={onPress}
          onPressIn={onPressIn}
          viewContext={rest.viewContext}
        />
      </View>
    )
  }
}
