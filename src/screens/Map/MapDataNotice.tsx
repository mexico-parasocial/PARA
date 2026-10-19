import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {type MapCivicQuery} from '#/state/queries/map-cabildeos'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'
import {SHOW_MAP_PREVIEW_FACTS} from './mapData'

export function MapReferenceNotice({
  kind,
}: {
  kind: 'state' | 'city' | 'district'
}) {
  const t = useTheme()
  return (
    <View style={[a.gap_xs, a.mb_md]}>
      {kind === 'district' && (
        <Text style={[a.text_sm, a.font_bold, t.atoms.text_contrast_high]}>
          <Trans>Illustrative district shapes — not official boundaries.</Trans>
        </Text>
      )}
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
        {SHOW_MAP_PREVIEW_FACTS ? (
          kind === 'city' ? (
            <Trans>
              Preview facts: population, mayor and party have no verified source
              date.
            </Trans>
          ) : (
            <Trans>
              Demo statistics and officeholders — not verified civic facts.
            </Trans>
          )
        ) : (
          <Trans>
            Verified statistics and officeholder information are not available
            yet.
          </Trans>
        )}
      </Text>
    </View>
  )
}

export function MapCivicDataNotice({
  query,
  count,
}: {
  query: MapCivicQuery
  /** Number of records matching the visible place/topic, not the global list. */
  count: number
}) {
  const t = useTheme()
  const {_} = useLingui()
  const hasData = query.data !== undefined
  const isDemo = query.provenance?.source === 'demo'
  const partial = query.provenance?.hasMore
  const retry = query.isError || isDemo
  return (
    <View accessibilityLiveRegion="polite" style={[a.gap_xs, a.mb_md]}>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
        {!hasData ? (
          query.isError ? (
            <Trans>Civic activity is unavailable. Counts are unknown.</Trans>
          ) : (
            <Trans>Loading civic activity…</Trans>
          )
        ) : query.isError ? (
          <Trans>
            Could not refresh civic activity. Showing the last loaded results.
          </Trans>
        ) : isDemo ? (
          query.provenance?.demoReason === 'unavailable' ? (
            <Trans>
              Demo civic activity: the service is unavailable. These are sample
              results.
            </Trans>
          ) : (
            <Trans>
              Demo civic activity: the service returned no records. These are
              sample results.
            </Trans>
          )
        ) : count === 0 ? (
          partial ? (
            <Trans>
              No matches in the loaded results. Coverage is incomplete.
            </Trans>
          ) : (
            <Trans>No civic activity matches this view.</Trans>
          )
        ) : (
          <Trans>{count} civic discussions in the loaded results.</Trans>
        )}
      </Text>
      {hasData && partial && (count > 0 || query.isError) && (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>
            Coverage is incomplete. Counts show only loaded results.
          </Trans>
        </Text>
      )}
      {hasData && query.isFetching && (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>Refreshing civic activity…</Trans>
        </Text>
      )}
      {isDemo && query.isError && (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>The last loaded results are demo civic activity.</Trans>
        </Text>
      )}
      {retry && (
        <Button
          label={_(msg`Retry civic activity`)}
          variant="solid"
          color="secondary"
          size="small"
          disabled={query.isFetching}
          onPress={() => void query.refetch()}>
          <ButtonText>
            <Trans>Retry</Trans>
          </ButtonText>
        </Button>
      )}
    </View>
  )
}
