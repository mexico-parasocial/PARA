import {useMemo} from 'react'
import {ScrollView, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {type ParaSearchPostsFilters} from '#/state/queries/search-posts'
import {atoms as a, useTheme, web} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {ParaFilterChip} from './components/ParaFilterChip'
import {CabildeoPickerDialog} from './dialogs/CabildeoPickerDialog'
import {CommunityPickerDialog} from './dialogs/CommunityPickerDialog'
import {CompassPickerDialog} from './dialogs/CompassPickerDialog'
import {PolicyAreaPickerDialog} from './dialogs/PolicyAreaPickerDialog'

export function ParaSearchFiltersBar({
  filters,
  onChange,
}: {
  filters: ParaSearchPostsFilters
  onChange: (next: ParaSearchPostsFilters) => void
}) {
  const {_} = useLingui()
  const t = useTheme()

  const policyControl = Dialog.useDialogControl()
  const compassControl = Dialog.useDialogControl()
  const communityControl = Dialog.useDialogControl()
  const cabildeoControl = Dialog.useDialogControl()

  const hasAny = useMemo(
    () =>
      Boolean(
        filters.tag?.length ||
          filters.communityUris?.length ||
          filters.cabildeoUris?.length ||
          filters.politicalCompassPositions?.length,
      ),
    [filters],
  )

  const setTag = (next: string[]) => {
    onChange({...filters, tag: next.length ? next : undefined})
  }

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
          activeCount={filters.tag?.length ?? 0}
          onPress={policyControl.open}
          onClear={
            filters.tag?.length ? () => setTag([]) : undefined
          }
        />
        <ParaFilterChip
          label={_(msg`Compass`)}
          activeCount={filters.politicalCompassPositions?.length ?? 0}
          onPress={compassControl.open}
          onClear={
            filters.politicalCompassPositions?.length
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
          activeCount={filters.communityUris?.length ?? 0}
          onPress={communityControl.open}
          onClear={
            filters.communityUris?.length
              ? () => onChange({...filters, communityUris: undefined})
              : undefined
          }
        />
        <ParaFilterChip
          label={_(msg`Cabildeos`)}
          activeCount={filters.cabildeoUris?.length ?? 0}
          onPress={cabildeoControl.open}
          onClear={
            filters.cabildeoUris?.length
              ? () => onChange({...filters, cabildeoUris: undefined})
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
        selectedTags={filters.tag ?? []}
        onConfirm={setTag}
      />
      <CompassPickerDialog
        control={compassControl}
        selected={filters.politicalCompassPositions ?? []}
        onConfirm={next =>
          onChange({
            ...filters,
            politicalCompassPositions: next.length ? next : undefined,
          })
        }
      />
      <CommunityPickerDialog
        control={communityControl}
        selected={filters.communityUris ?? []}
        onConfirm={next =>
          onChange({...filters, communityUris: next.length ? next : undefined})
        }
      />
      <CabildeoPickerDialog
        control={cabildeoControl}
        selected={filters.cabildeoUris ?? []}
        onConfirm={next =>
          onChange({...filters, cabildeoUris: next.length ? next : undefined})
        }
      />
    </View>
  )
}
