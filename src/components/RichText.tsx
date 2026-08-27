import {useMemo} from 'react'
import {type StyleProp, type TextStyle} from 'react-native'
import {RichText as RichTextAPI} from '@bsky.app/sdk/richtext'

import {toShortUrl} from '#/lib/strings/url-helpers'
import {POST_FLAIRS, POST_TYPES} from '#/lib/tags'
import {android, atoms as a, flatten, type TextStyleProp} from '#/alf'
import {isOnlyEmoji} from '#/alf/typography'
import {InlineLinkText, type LinkProps} from '#/components/Link'
import {ProfileHoverCard} from '#/components/ProfileHoverCard'
import {RichTextTag} from '#/components/RichTextTag'
import {Text, type TextProps} from '#/components/Typography'
import {app} from '#/lexicons'
import * as bsky from '#/types/bsky'

const WORD_WRAP = {wordWrap: 1}
// lifted from facet detection in `RichText` impl, _without_ `gm` flags
const URL_REGEX =
  /(^|\s|\()((https?:\/\/[\S]+)|((?<domain>[a-z][a-z0-9]*(\.[a-z0-9]+)+)[\S]*))/i

function isPARATag(tagStr: string) {
  const norm = tagStr
    .trim()
    .toLowerCase()
    .replace(/^[|#?]+/, '')
  const flairs = Object.values(POST_FLAIRS)
  const types = Object.values(POST_TYPES)
  const allTags = [...flairs, ...types].map(f => f.tag).filter(Boolean)

  return allTags.some(tag => {
    if (!tag) return false
    const flairNorm = tag.toLowerCase().replace(/^[|#?]+/, '')
    return flairNorm === norm
  })
}

/**
 * Structural shape of a legacy `@atproto/api` RichText, which is not
 * `instanceof` the SDK class. See the unwrap in {@link RichText}.
 */
type LegacyRichTextLike = {text: string; facets?: unknown[]}

export type RichTextProps = TextStyleProp &
  Pick<TextProps, 'selectable' | 'onLayout' | 'onTextLayout'> & {
    value: RichTextAPI | LegacyRichTextLike | string
    testID?: string
    numberOfLines?: number
    disableLinks?: boolean
    enableTags?: boolean
    authorHandle?: string
    onLinkPress?: LinkProps['onPress']
    interactiveStyle?: StyleProp<TextStyle>
    emojiMultiplier?: number
    shouldProxyLinks?: boolean
    suffix?: React.ReactNode
    /**
     * How far below the text baseline `suffix` extends, in px.
     *
     * Android clips inline views that are translated below the measured text
     * bounds. Reserve matching room there and cancel it with a negative margin
     * so content following the text does not move. iOS allows inline attachment
     * overflow through `RNUITextView` and does not need this compensation.
     *
     * Overrides any `paddingBottom`/`marginBottom` set via `style` on Android.
     */
    suffixOffset?: number
    /**
     * DANGEROUS: Disable facet lexicon validation
     *
     * `detectFacetsWithoutResolution()` generates technically invalid facets,
     * with a handle in place of the DID. This means that RichText that uses it
     * won't be able to render links.
     *
     * Use with care - only use if you're rendering facets you're generating yourself.
     */
    disableMentionFacetValidation?: true
  }

export function RichText({
  testID,
  value,
  style,
  numberOfLines,
  disableLinks,
  selectable,
  enableTags = false,
  authorHandle,
  onLinkPress,
  interactiveStyle,
  emojiMultiplier = 1.85,
  onLayout,
  onTextLayout,
  shouldProxyLinks,
  suffix,
  suffixOffset = 0,
  disableMentionFacetValidation,
}: RichTextProps) {
  const richText = useMemo(() => {
    if (value instanceof RichTextAPI) {
      return value
    }
    /*
     * The app is mid-migration to `@bsky.app/sdk`, and many call sites still
     * hold a `RichText` from `@atproto/api`. Those are a different class, so
     * the `instanceof` above misses them - passing one straight through as
     * `text` would nest the object inside `UnicodeString`, and every later
     * `.replace()` on `richText.text` would throw. Rebuild from its already
     * resolved text/facets instead (the facet JSON shape is identical), and
     * skip detection so server-resolved mentions survive.
     *
     * Remove this branch once nothing imports `RichText` from `@atproto/api`.
     */
    if (typeof value !== 'string') {
      return new RichTextAPI({
        text: value.text,
        facets: value.facets as RichTextAPI['facets'],
      })
    }
    const rt = new RichTextAPI({text: value})
    rt.detectFacetsWithoutResolution()
    return rt
  }, [value])

  const plainStyles = style
  const suffixStyles =
    suffix && suffixOffset
      ? android({paddingBottom: suffixOffset, marginBottom: -suffixOffset})
      : null
  const interactiveStyles = [plainStyles, interactiveStyle]

  const {text, facets} = richText

  if (!facets?.length) {
    if (isOnlyEmoji(text)) {
      const flattenedStyle = flatten(style) ?? {}
      const fontSize =
        (flattenedStyle.fontSize ?? a.text_sm.fontSize) * emojiMultiplier
      return (
        <Text
          emoji
          selectable={selectable}
          testID={testID}
          style={[plainStyles, {fontSize}, suffixStyles]}
          onLayout={onLayout}
          onTextLayout={onTextLayout}
          dataSet={WORD_WRAP}>
          {text}
          {suffix ? ' ' : null}
          {suffix}
        </Text>
      )
    }
    let rawDisplay = text
    rawDisplay = rawDisplay.replace(/\[PARA\]\s*/gi, '')
    rawDisplay = rawDisplay.replace(/(?:\|{1,2}\??#\S+)(\s+|$)/g, '')

    return (
      <Text
        emoji
        selectable={selectable}
        testID={testID}
        style={[plainStyles, suffixStyles]}
        numberOfLines={numberOfLines}
        onLayout={onLayout}
        onTextLayout={onTextLayout}
        dataSet={WORD_WRAP}>
        {rawDisplay}
        {suffix ? ' ' : null}
        {suffix}
      </Text>
    )
  }

  const els = []
  let key = 0
  // N.B. must access segments via `richText.segments`, not via destructuring
  const segments = Array.from(richText.segments())

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const link = segment.link
    const mention = segment.mention
    const tag = segment.tag
    if (
      mention &&
      (disableMentionFacetValidation ||
        bsky.matches(app.bsky.richtext.facet.mention, mention)) &&
      !disableLinks
    ) {
      els.push(
        <ProfileHoverCard key={key} did={mention.did}>
          <InlineLinkText
            selectable={selectable}
            to={`/profile/${mention.did}`}
            style={interactiveStyles}
            // @ts-expect-error TODO
            dataSet={WORD_WRAP}
            shouldProxy={shouldProxyLinks}
            onPress={onLinkPress}>
            {segment.text}
          </InlineLinkText>
        </ProfileHoverCard>,
      )
    } else if (link && bsky.matches(app.bsky.richtext.facet.link, link)) {
      const isValidLink = URL_REGEX.test(link.uri)
      if (!isValidLink || disableLinks) {
        els.push(toShortUrl(segment.text))
      } else {
        els.push(
          <InlineLinkText
            selectable={selectable}
            key={key}
            to={link.uri}
            style={interactiveStyles}
            // @ts-expect-error TODO
            dataSet={WORD_WRAP}
            shareOnLongPress
            shouldProxy={shouldProxyLinks}
            onPress={onLinkPress}
            emoji>
            {toShortUrl(segment.text)}
          </InlineLinkText>,
        )
      }
    } else if (
      !disableLinks &&
      enableTags &&
      tag &&
      bsky.matches(app.bsky.richtext.facet.tag, tag)
    ) {
      if (isPARATag(tag.tag)) {
        key++
        continue
      }
      els.push(
        <RichTextTag
          key={key}
          display={segment.text}
          tag={tag.tag}
          textStyle={interactiveStyles}
          authorHandle={authorHandle}
        />,
      )
    } else {
      if (tag && isPARATag(tag.tag)) {
        key++
        continue
      }

      let display = segment.text
      display = display.replace(/\[PARA\]\s*/gi, '')
      display = display.replace(/(?:\|{1,2}\??#\S+)(\s+|$)/g, '')

      const nextSegment = segments[i + 1]
      const nextTag = nextSegment?.tag
      if (
        nextTag &&
        bsky.matches(app.bsky.richtext.facet.tag, nextTag) &&
        isPARATag(nextTag.tag)
      ) {
        display = display.replace(/(?:\s*\|\|?\s*)$/, '')
      }

      if (display) {
        els.push(display)
      }
    }
    key++
  }

  return (
    <Text
      emoji
      selectable={selectable}
      testID={testID}
      style={[plainStyles, suffixStyles]}
      numberOfLines={numberOfLines}
      onLayout={onLayout}
      onTextLayout={onTextLayout}
      dataSet={WORD_WRAP}>
      {els}
      {suffix ? ' ' : null}
      {suffix}
    </Text>
  )
}
