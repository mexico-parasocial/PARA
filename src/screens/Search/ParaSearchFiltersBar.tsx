import {useMemo} from 'react'
import {ScrollView, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  paraFiltersToSearchFilters,
  type SearchFilters,
  searchFiltersToParaFilters,
} from '#/screens/Search/searchParams'
import {atoms as a, useTheme, web} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {ParaFilterChip} from './components/ParaFilterChip'
import {AdvancedParaFiltersDialog} from './dialogs/AdvancedParaFiltersDialog'
import {CabildeoPickerDialog} from './dialogs/CabildeoPickerDialog'
import {CommunityPickerDialog} from './dialogs/CommunityPickerDialog'
import {CompassPickerDialog} from './dialogs/CompassPickerDialog'
import {PolicyAreaPickerDialog} from './dialogs/PolicyAreaPickerDialog'

function splitSearchFilterValue(value: string | undefined): string[] {
  return value?.split(',').filter(Boolean) ?? []
}

function joinSearchFilterValue(values: string[]): string | undefined {
  return values.length ? values.join(',') : undefined
}

function splitTagSearchFilterValue(value: string | undefined): string[] {
  return value?.split(/\s+/).filter(Boolean) ?? []
}

function joinTagSearchFilterValue(values: string[]): string | undefined {
  return values.length ? values.join(' ') : undefined
}

export function ParaSearchFiltersBar({
  filters,
  onChange,
}: {
  filters: SearchFilters
  onChange: (next: SearchFilters) => void
}) {
  const {_} = useLingui()
  const t = useTheme()

  const policyControl = Dialog.useDialogControl()
  const compassControl = Dialog.useDialogControl()
  const communityControl = Dialog.useDialogControl()
  const cabildeoControl = Dialog.useDialogControl()
  const advancedControl = Dialog.useDialogControl()

  const paraFilters = useMemo(
    () => searchFiltersToParaFilters(filters),
    [filters],
  )

  const tagCount = splitTagSearchFilterValue(filters.tag).length
  const compassCount = splitSearchFilterValue(
    filters.politicalCompassPositions,
  ).length
  const communityCount = splitSearchFilterValue(filters.communityUris).length
  const cabildeoCount = splitSearchFilterValue(filters.cabildeoUris).length

  const advancedCount = useMemo(
    () =>
      (filters.postType ? 1 : 0) +
      splitSearchFilterValue(filters.flairs).length +
      (filters.party ? 1 : 0) +
      (filters.verifiedPublicFigure ? 1 : 0),
    [filters],
  )

  const hasAny = useMemo(
    () =>
      Boolean(
        tagCount ||
          compassCount ||
          communityCount ||
          cabildeoCount ||
          filters.state ||
          filters.districtKey ||
          filters.cabildeoPhase ||
          advancedCount,
      ),
    [
      tagCount,
      compassCount,
      communityCount,
      cabildeoCount,
      filters.state,
      filters.districtKey,
      filters.cabildeoPhase,
      advancedCount,
    ],
  )

  return (
    <View
      style={[
        a.px_md,
        a.py_sm,
        a.border_b,
        t.atoms.border_contrast_low,
        t.atoms.bg_contrast_25,
        web([a.sticky, {top: 0}]),
      ]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[a.gap_xs, a.align_center]}>
        <ParaFilterChip
          label={_(msg`Areas`)}
          activeCount={tagCount}
          onPress={policyControl.open}
          onClear={tagCount ? () => onChange({...filters, tag: undefined}) : undefined}
        />
        <ParaFilterChip
          label={_(msg`Compass`)}
          activeCount={compassCount}
          onPress={compassControl.open}
          onClear={
            compassCount
              ? () =>
                  onChange({
                    ...filters,
                    politicalCompassPositions: undefined,
                  })
              : undefined
          }
        />
        <ParaFilterChip
          label={_(msg`Communities`)}
          activeCount={communityCount}
          onPress={communityControl.open}
          onClear={
            communityCount
              ? () => onChange({...filters, communityUris: undefined})
              : undefined
          }
        />
        <ParaFilterChip
          label={_(msg`Cabildeos`)}
          activeCount={cabildeoCount}
          onPress={cabildeoControl.open}
          onClear={
            cabildeoCount
              ? () => onChange({...filters, cabildeoUris: undefined})
              : undefined
          }
        />
        <ParaFilterChip
          label={_(msg`More`)}
          activeCount={advancedCount}
          onPress={advancedControl.open}
          onClear={
            advancedCount
              ? () =>
                  onChange({
                    ...filters,
                    postType: undefined,
                    flairs: undefined,
                    party: undefined,
                    verifiedPublicFigure: undefined,
                  })
              : undefined
          }
        />
        {hasAny ? (
          <Button
            variant="ghost"
            color="primary"
            onPress={() => onChange({})}
            label={_(msg`Clear all filters`)}>
            <ButtonText>
              <Trans>Clear all</Trans>
            </ButtonText>
          </Button>
        ) : null}
      </ScrollView>

      <PolicyAreaPickerDialog
        control={policyControl}
        selectedTags={splitTagSearchFilterValue(filters.tag)}
        onConfirm={next =>
          onChange({...filters, tag: joinTagSearchFilterValue(next)})
        }
      />
      <CompassPickerDialog
        control={compassControl}
        selected={splitSearchFilterValue(filters.politicalCompassPositions)}
        onConfirm={next =>
          onChange({
            ...filters,
            politicalCompassPositions: joinSearchFilterValue(next),
          })
        }
      />
      <CommunityPickerDialog
        control={communityControl}
        selected={splitSearchFilterValue(filters.communityUris)}
        onConfirm={next =>
          onChange({...filters, communityUris: joinSearchFilterValue(next)})
        }
      />
      <CabildeoPickerDialog
        control={cabildeoControl}
        selected={splitSearchFilterValue(filters.cabildeoUris)}
        onConfirm={next =>
          onChange({...filters, cabildeoUris: joinSearchFilterValue(next)})
        }
      />
      <AdvancedParaFiltersDialog
        control={advancedControl}
        filters={paraFilters}
        onConfirm={next =>
          onChange({...filters, ...paraFiltersToSearchFilters(next)})
        }
      />
    </View>
  )
}
