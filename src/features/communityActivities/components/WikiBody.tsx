import {useMemo} from 'react'

import {parseWikiBody} from '#/lib/community-activities'
import {atoms as a} from '#/alf'
import {InlineLinkText} from '#/components/Link'
import {Text} from '#/components/Typography'
import {communityWikiPagePath} from '../routes'

/**
 * Renders a wiki body with `[[slug]]` links to sibling pages and bare URLs
 * as tappable links. A link to a page that does not exist yet still opens the
 * page screen, where organizers can create it — as on any wiki.
 */
export function WikiBody({
  body,
  communityUri,
  communityName,
  communityId,
}: {
  body: string
  communityUri: string
  communityName: string
  communityId?: string
}) {
  const segments = useMemo(() => parseWikiBody(body), [body])
  return (
    <Text selectable style={[a.text_md, a.leading_relaxed]}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') return segment.text
        if (segment.type === 'url') {
          return (
            <InlineLinkText
              key={index}
              to={segment.url}
              label={segment.url}
              style={[a.text_md, a.leading_relaxed]}>
              {segment.url}
            </InlineLinkText>
          )
        }
        return (
          <InlineLinkText
            key={index}
            to={communityWikiPagePath({
              communityUri,
              communityName,
              communityId,
              slug: segment.slug,
            })}
            label={segment.label}
            style={[a.text_md, a.leading_relaxed, a.font_semi_bold]}>
            {segment.label}
          </InlineLinkText>
        )
      })}
    </Text>
  )
}
