import {useCallback, useMemo} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {codeToLanguageName} from '#/locale/helpers'
import {type SearchFilters} from '#/screens/Search/searchParams'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Warning_Stroke2_Corner0_Rounded as WarningIcon} from '#/components/icons/Warning'
import {Text} from '#/components/Typography'

export function DetectedLanguagesAdmonition({
  detectedQueryLanguages,
  filters,
  onChangeFilters,
}: {
  detectedQueryLanguages: string[] | undefined
  filters: SearchFilters
  onChangeFilters: (filters: SearchFilters) => void
}) {
  const {_: _l, i18n} = useLingui()
  const t = useTheme()

  const languages = useMemo(() => {
    const langs = detectedQueryLanguages ?? []
    return langs
      .map(code => ({
        code,
        name: codeToLanguageName(code, i18n.locale),
      }))
      .filter(({code}) => code !== filters.lang)
  }, [detectedQueryLanguages, filters.lang, i18n.locale])

  const onAddLanguage = useCallback(
    (code: string) => {
      onChangeFilters({...filters, lang: code})
    },
    [filters, onChangeFilters],
  )

  if (!languages.length) return null

  return (
    <View
      style={[
        a.flex_row,
        a.align_start,
        a.gap_sm,
        a.p_md,
        a.rounded_sm,
        {backgroundColor: t.atoms.bg_contrast_50.backgroundColor},
      ]}>
      <WarningIcon
        width={16}
        height={16}
        style={[a.mt_xs, {color: t.atoms.text_contrast_medium.color}]}
      />
      <View style={[a.flex_1, a.gap_sm]}>
        <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_high]}>
          <Trans>
            Your search query looks like it may be in{' '}
            {languages.map(({name}, i) => (
              <Text key={i} style={[a.font_bold]}>
                {i > 0 && languages.length > 2 ? ', ' : ''}
                {i === languages.length - 1 && i > 0 ? ' or ' : ''}
                {name}
              </Text>
            ))}
            . Add a language filter to get the most relevant results.
          </Trans>
        </Text>
        <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
          {languages.map(({code, name}) => (
            <Button
              key={code}
              label={_l(msg`Filter by ${name}`)}
              size="tiny"
              color="secondary"
              variant="solid"
              onPress={() => onAddLanguage(code)}>
              <ButtonText>{name}</ButtonText>
            </Button>
          ))}
        </View>
      </View>
    </View>
  )
}
