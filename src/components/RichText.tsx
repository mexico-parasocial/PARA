import {useMemo} from 'react'
import {type StyleProp, type TextStyle} from 'react-native'
import {AppBskyRichtextFacet, RichText as RichTextAPI} from '@atproto/api'

import {toShortUrl} from '#/lib/strings/url-helpers'
import {POST_FLAIRS, POST_TYPES} from '#/lib/tags'
import {atoms as a, flatten, type TextStyleProp} from '#/alf'
import {isOnlyEmoji} from '#/alf/typography'
import {InlineLinkText, type LinkProps} from '#/components/Link'
import {ProfileHoverCard} from '#/components/ProfileHoverCard'
import {RichTextTag} from '#/components/RichTextTag'
import {Text, type TextProps} from '#/components/Typography'

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

export type RichTextProps = TextStyleProp &
  Pick<TextProps, 'selectable' | 'onLayout' | 'onTextLayout'> & {
    value: RichTextAPI | string
    testID?: string
    numberOfLines?: number
    disableLinks?: boolean
    enableTags?: boolean
    authorHandle?: string
    onLinkPress?: LinkProps['onPress']
    interactiveStyle?: StyleProp<TextStyle>
    emojiMultiplier?: number
    shouldProxyLinks?: boolean
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
  disableMentionFacetValidation,
}: RichTextProps) {
  const richText = useMemo(() => {
    if (value instanceof RichTextAPI) {
      return value
    } else {
      const rt = new RichTextAPI({text: value})
      rt.detectFacetsWithoutResolution()
      return rt
    }
  }, [value])

  const plainStyles = [a.leading_snug, style]
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
          style={[plainStyles, {fontSize}]}
          onLayout={onLayout}
          onTextLayout={onTextLayout}
          // @ts-ignore web only -prf
          dataSet={WORD_WRAP}>
          {text}
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
        style={plainStyles}
        numberOfLines={numberOfLines}
        onLayout={onLayout}
        onTextLayout={onTextLayout}
        // @ts-ignore web only -prf
        dataSet={WORD_WRAP}>
        {rawDisplay}
      </Text>
    )
  }

  const els = []
  let key = 0
  const segments = Array.from(richText.segments())

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const link = segment.link
    const mention = segment.mention
    const tag = segment.tag
    if (
      mention &&
      (disableMentionFacetValidation ||
        AppBskyRichtextFacet.validateMention(mention).success) &&
      !disableLinks
    ) {
      els.push(
        <ProfileHoverCard key={key} did={mention.did}>
          <InlineLinkText
            selectable={selectable}
            to={`/profile/${mention.did}`}
            style={interactiveStyles}
            // @ts-ignore TODO
            dataSet={WORD_WRAP}
            shouldProxy={shouldProxyLinks}
            onPress={onLinkPress}>
            {segment.text}
          </InlineLinkText>
        </ProfileHoverCard>,
      )
    } else if (link && AppBskyRichtextFacet.validateLink(link).success) {
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
            // @ts-ignore TODO
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
      AppBskyRichtextFacet.validateTag(tag).success
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
      display = display.replace(/\[PARA\]\s*/g, '')

      const nextSegment = segments[i + 1]
      const nextTag = nextSegment?.tag
      if (
        nextTag &&
        AppBskyRichtextFacet.validateTag(nextTag).success &&
        isPARATag(nextTag.tag)
      ) {
        display = display.replace(/(?:\s*\|\|?\s*)$/g, '')
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
      style={plainStyles}
      numberOfLines={numberOfLines}
      onLayout={onLayout}
      onTextLayout={onTextLayout}
      // @ts-ignore web only -prf
      dataSet={WORD_WRAP}>
      {els}
    </Text>
  )
}
