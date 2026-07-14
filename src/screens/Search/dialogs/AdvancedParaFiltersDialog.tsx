import {useState} from 'react'
import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {type ParaSearchPostsFilters} from '#/state/queries/search-posts'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Text} from '#/components/Typography'
import {ParaPostMetaSection} from '../components/AdvancedSearchDialog/ParaPostMetaSection'

export {useDialogControl} from '#/components/Dialog'

export function AdvancedParaFiltersDialog({
  control,
  filters,
  onConfirm,
}: {
  control: Dialog.DialogControlProps
  filters: ParaSearchPostsFilters
  onConfirm: (next: ParaSearchPostsFilters) => void
}) {
  const {t: l} = useLingui()
  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Dialog.ScrollableInner
        label={l`More filters`}
        style={[{maxWidth: 500, width: '100%'}]}>
        <Inner control={control} filters={filters} onConfirm={onConfirm} />
        <Dialog.Close />
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}

function Inner({
  control,
  filters,
  onConfirm,
}: {
  control: Dialog.DialogControlProps
  filters: ParaSearchPostsFilters
  onConfirm: (next: ParaSearchPostsFilters) => void
}) {
  const {t: l} = useLingui()
  const t = useTheme()

  const [postType, setPostType] = useState(filters.postType)
  const [flairsInput, setFlairsInput] = useState(
    filters.flairs?.join(' ') ?? '',
  )
  const [party, setParty] = useState(filters.party)
  const [verifiedPublicFigure, setVerifiedPublicFigure] = useState(
    filters.verifiedPublicFigure ?? false,
  )

  const handleConfirm = () => {
    const next: ParaSearchPostsFilters = {
      ...filters,
      postType,
      party,
      verifiedPublicFigure: verifiedPublicFigure || undefined,
      flairs: flairsInput
        ? flairsInput
            .split(/\s+/)
            .map(f => f.trim())
            .filter(Boolean)
        : undefined,
    }
    onConfirm(next)
    control.close()
  }

  return (
    <View style={[a.gap_md]}>
      <View>
        <Text style={[a.text_md, a.font_bold]}>
          <Trans>More filters</Trans>
        </Text>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>Refine posts by type, flair, party, or public figure status.</Trans>
        </Text>
      </View>

      <ParaPostMetaSection
        postType={postType}
        onChangePostType={setPostType}
        flairsInput={flairsInput}
        onChangeFlairsInput={setFlairsInput}
        party={party}
        onChangeParty={setParty}
        verifiedPublicFigure={verifiedPublicFigure}
        onChangeVerifiedPublicFigure={setVerifiedPublicFigure}
        onSubmitEditing={handleConfirm}
      />

      <View style={[a.flex_row, a.gap_sm, a.justify_end]}>
        <Button
          variant="solid"
          color="primary"
          onPress={handleConfirm}
          label={l`Apply`}>
          <ButtonText>
            <Trans>Apply</Trans>
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}
