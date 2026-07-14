import {useCallback, useMemo, useRef, useState} from 'react'
import {type ScrollView, View} from 'react-native'
import {Plural, Trans, useLingui} from '@lingui/react/macro'

import {
  countActiveFilters,
  countActiveParaFilters,
  FILTER_PARAM_KEYS,
  getActiveParaFilterNames,
  hasActiveFilters,
  type SearchFilters,
} from '#/screens/Search/searchParams'
import {atoms as a, native, platform, useBreakpoints, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'
import {
  ChevronBottom_Stroke2_Corner0_Rounded as ChevronDownIcon,
  ChevronTopBottom_Stroke2_Corner0_Rounded as ChevronUpDownIcon,
} from '#/components/icons/Chevron'
import {CircleInfo_Stroke2_Corner0_Rounded as CircleInfoIcon} from '#/components/icons/CircleInfo'
import {PlusLarge_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import {SettingsSliderVertical_Stroke2_Corner0_Rounded as SettingsSliderIcon} from '#/components/icons/SettingsSlider'
import * as Menu from '#/components/Menu'
import {Text} from '#/components/Typography'
import {useAnalytics} from '#/analytics'
import {IS_WEB} from '#/env'
import {SearchLanguageDropdown} from '../SearchLanguageDropdown'
import {ClearableDateField, DEFAULT_DATE} from './ClearableDateField'
import {ClearableInput} from './ClearableInput'
import {FilterBlock} from './FilterBlock'
import {FollowingDropdown} from './FollowingDropdown'
import {MediaDropdown} from './MediaDropdown'
import {ParaGeographySection} from './ParaGeographySection'
import {ParaPostMetaSection} from './ParaPostMetaSection'
import {RepliesDropdown} from './RepliesDropdown'
import {
  type AdvancedFilter,
  type FilterField,
  type FollowingFilter,
  makeFilter,
  type MediaFilter,
  parseAdvancedSearch,
  type RepliesFilter,
  serializeAdvancedSearch,
} from './utils'

const MAX_FILTERS = 20

export function AdvancedSearchDialog({
  disabled,
  q,
  filters,
  onSubmit,
}: {
  disabled: boolean
  q: string
  filters: SearchFilters
  onSubmit: (q: string, filters: SearchFilters) => void
}) {
  const ax = useAnalytics()
  const {t: l} = useLingui()
  const control = Dialog.useDialogControl()
  const filtersActive = hasActiveFilters(filters)
  const stateKey = useMemo(
    () =>
      JSON.stringify([q, ...FILTER_PARAM_KEYS.map(key => filters[key] ?? '')]),
    [q, filters],
  )

  return (
    <>
      <View style={[a.relative]}>
        <Button
          disabled={disabled}
          label={l`Open advanced search options`}
          size="small"
          color={filtersActive ? 'primary_subtle' : 'secondary'}
          style={native([a.py_sm, a.px_sm])}
          onPress={() => {
            ax.metric('search:advanced:press', {
              filterCount: countActiveFilters(filters),
              paraFilterCount: countActiveParaFilters(filters),
              paraFilters: getActiveParaFilterNames(filters),
            })
            control.open()
          }}>
          <ButtonIcon icon={SettingsSliderIcon} />
          <ButtonText>
            <Trans context="search">Filters</Trans>
          </ButtonText>
        </Button>
      </View>

      <Dialog.Outer control={control} nativeOptions={{preventExpansion: true}}>
        <Dialog.Handle />
        <DialogInner
          key={stateKey}
          control={control}
          q={q}
          filters={filters}
          onSubmit={onSubmit}
        />
      </Dialog.Outer>
    </>
  )
}

function DialogInner({
  control,
  q,
  filters: filterParams,
  onSubmit,
}: {
  control: Dialog.DialogControlProps
  q: string
  filters: SearchFilters
  onSubmit: (q: string, filters: SearchFilters) => void
}) {
  const ax = useAnalytics()
  const t = useTheme()
  const {t: l} = useLingui()
  const {gtTablet} = useBreakpoints()
  // Two-column layout for the word fields, web-only at the widest breakpoint.
  const twoColumn = IS_WEB && gtTablet

  const parsed = useMemo(
    () => parseAdvancedSearch(q, filterParams),
    [q, filterParams],
  )

  const [query, setQuery] = useState(parsed.query)
  const [exactPhrase, setExactPhrase] = useState(parsed.exactPhrase)
  const [negatedWords, setNegatedWords] = useState(parsed.negatedWords)
  const [language, setLanguage] = useState(parsed.language)

  const [media, setMedia] = useState<MediaFilter>(parsed.media)
  const [replies, setReplies] = useState<RepliesFilter>(parsed.replies)
  const [following, setFollowing] = useState<FollowingFilter>(parsed.following)

  /*
   * The date picker requires a valid date, so these always hold one. The
   * accompanying `active` flags track whether the date is actually part of the
   * query, so that a date equal to today (the default) can still be applied.
   */
  const [dateSince, setDateSince] = useState(parsed.since || DEFAULT_DATE)
  const [dateSinceActive, setDateSinceActive] = useState(!!parsed.since)
  const [dateUntil, setDateUntil] = useState(parsed.until || DEFAULT_DATE)
  const [dateUntilActive, setDateUntilActive] = useState(!!parsed.until)

  const [filters, setFilters] = useState<AdvancedFilter[]>(parsed.filters)

  const [state, setState] = useState(parsed.state)
  const [districtKey, setDistrictKey] = useState(parsed.districtKey)
  const [cabildeoPhase, setCabildeoPhase] = useState(parsed.cabildeoPhase)
  const [postType, setPostType] = useState(parsed.postType)
  const [flairsInput, setFlairsInput] = useState(
    parsed.flairs?.split(',').filter(Boolean).join(' ') ?? '',
  )
  const [party, setParty] = useState(parsed.party)
  const [verifiedPublicFigure, setVerifiedPublicFigure] = useState(
    parsed.verifiedPublicFigure === 'true',
  )

  const trackParaFilter = useCallback(
    (field: string, value?: string) => {
      if (value) {
        ax.metric('search:paraFilter:select', {field, value})
      } else {
        ax.metric('search:paraFilter:clear', {field})
      }
    },
    [ax],
  )

  const scrollRef = useRef<ScrollView>(null)
  const filtersSectionRef = useRef<View>(null)

  const suggestions = [
    {
      all: l({
        message: 'presupuesto educación',
        comment:
          'Advanced search: Example of an “all of these words” civic search. Paired with “deporte cultura”.',
      }),
      none: l({
        message: 'deporte cultura',
        comment:
          'Advanced search: Example of a “none of these words” civic search. Paired with “presupuesto educación”.',
      }),
    },
    {
      all: l({
        message: 'seguridad ciudadana',
        comment:
          'Advanced search: Example of an “all of these words” civic search. Paired with “impuestos estatales”.',
      }),
      none: l({
        message: 'impuestos estatales',
        comment:
          'Advanced search: Example of a “none of these words” civic search. Paired with “seguridad ciudadana”.',
      }),
    },
    {
      all: l({
        message: 'agua potable',
        comment:
          'Advanced search: Example of an “all of these words” civic search. Paired with “transporte público”.',
      }),
      none: l({
        message: 'transporte público',
        comment:
          'Advanced search: Example of a “none of these words” civic search. Paired with “agua potable”.',
      }),
    },
    {
      all: l({
        message: 'salud mental',
        comment:
          'Advanced search: Example of an “all of these words” civic search. Paired with “infraestructura carretera”.',
      }),
      none: l({
        message: 'infraestructura carretera',
        comment:
          'Advanced search: Example of a “none of these words” civic search. Paired with “salud mental”.',
      }),
    },
    {
      all: l({
        message: 'participación ciudadana',
        comment:
          'Advanced search: Example of an “all of these words” civic search. Paired with “campaña electoral”.',
      }),
      none: l({
        message: 'campaña electoral',
        comment:
          'Advanced search: Example of a “none of these words” civic search. Paired with “participación ciudadana”.',
      }),
    },
    {
      all: l({
        message: 'derechos humanos',
        comment:
          'Advanced search: Example of an “all of these words” civic search. Paired with “contratos públicos”.',
      }),
      none: l({
        message: 'contratos públicos',
        comment:
          'Advanced search: Example of a “none of these words” civic search. Paired with “derechos humanos”.',
      }),
    },
    {
      all: l({
        message: 'energía renovable',
        comment:
          'Advanced search: Example of an “all of these words” civic search. Paired with “combustibles fósiles”.',
      }),
      none: l({
        message: 'combustibles fósiles',
        comment:
          'Advanced search: Example of a “none of these words” civic search. Paired with “energía renovable”.',
      }),
    },
    {
      all: l({
        message: 'transparencia gubernamental',
        comment:
          'Advanced search: Example of an “all of these words” civic search. Paired with “deuda pública”.',
      }),
      none: l({
        message: 'deuda pública',
        comment:
          'Advanced search: Example of a “none of these words” civic search. Paired with “transparencia gubernamental”.',
      }),
    },
  ]

  // eslint-disable-next-line react/hook-use-state
  const [suggestion] = useState(() =>
    Math.floor(Math.random() * suggestions.length),
  )

  function addFilter(field: FilterField = 'authors') {
    if (filters.length >= MAX_FILTERS) return
    /*
     * New blocks append to the end so the newest sits directly above the
     * "Add filter" button, which renders below the list.
     */
    setFilters(prev => [...prev, makeFilter(field)])
    ax.metric('search:addFilter:press', {
      filterCount: filters.length + 1,
      field,
      mode: 'include',
    })
    /*
     * Wait for the new block to render, then scroll the bottom of the dialog
     * (the new block plus the button beneath it) into view.
     */
    requestAnimationFrame(() => {
      if (IS_WEB) {
        const node = filtersSectionRef.current as unknown as HTMLElement | null
        node?.scrollIntoView?.({behavior: 'smooth', block: 'end'})
      } else {
        scrollRef.current?.scrollToEnd({animated: true})
      }
    })
  }

  function updateFilter(id: string, patch: Partial<AdvancedFilter>) {
    setFilters(prev =>
      prev.map(filter => (filter.id === id ? {...filter, ...patch} : filter)),
    )
  }

  function removeFilter(id: string) {
    setFilters(prev => prev.filter(filter => filter.id !== id))
  }

  function handlePressSearch() {
    const {q: nextQ, filters: nextFilters} = serializeAdvancedSearch({
      query,
      exactPhrase,
      negatedWords,
      language,
      replies,
      media,
      following,
      dateSince,
      dateSinceActive,
      dateUntil,
      dateUntilActive,
      filters,
      state,
      districtKey,
      cabildeoPhase,
      postType,
      flairs: flairsInput
        ? flairsInput.split(/\s+/).filter(Boolean).join(',')
        : undefined,
      party,
      verifiedPublicFigure: verifiedPublicFigure ? 'true' : undefined,
    })
    /*
     * Run the submit (navigation + state updates) inside the close callback so
     * it doesn't race the sheet's close animation on native.
     */
    control.close(() => onSubmit(nextQ, nextFilters))
  }

  function cancelButton() {
    return (
      <Button
        label={l`Cancel`}
        onPress={() => control.close()}
        size="small"
        color="secondary"
        variant="ghost"
        style={[a.rounded_full]}>
        <ButtonText>
          <Trans>Cancel</Trans>
        </ButtonText>
      </Button>
    )
  }

  function searchButton() {
    return (
      <Button
        label={l`Search`}
        onPress={handlePressSearch}
        size="small"
        color="primary"
        style={[a.rounded_full]}>
        <ButtonText>
          <Trans>Search</Trans>
        </ButtonText>
      </Button>
    )
  }

  return (
    <Dialog.ScrollableInner
      ref={scrollRef}
      label={l`Dialog: Set search filters`}
      contentContainerStyle={[a.px_0, a.pt_0]}
      header={
        <Dialog.Header renderLeft={cancelButton} renderRight={searchButton}>
          <Dialog.HeaderText>
            <Trans context="search">Filters</Trans>
          </Dialog.HeaderText>
        </Dialog.Header>
      }>
      <View style={[a.mt_xl, a.px_xl, a.gap_xl]}>
        <View style={[a.flex_1]}>
          <TextField.LabelText>
            <Trans>All of these words</Trans>
          </TextField.LabelText>
          <ClearableInput
            label={l`Search query`}
            defaultValue={query}
            placeholder={suggestions[suggestion].all}
            onChangeText={setQuery}
            onSubmitEditing={handlePressSearch}
          />
        </View>

        <View style={[twoColumn ? a.flex_row : a.flex_col, a.gap_xl]}>
          <View style={[a.flex_1]}>
            <TextField.LabelText>
              <Trans>This exact phrase</Trans>
            </TextField.LabelText>
            <ClearableInput
              label={l`None of these words`}
              defaultValue={negatedWords}
              placeholder={l({
                message: 'cows pigs',
                comment:
                  'Advanced search: Example of a “none of these words” search. Paired with “cats dogs”.',
              })}
              onChangeText={setNegatedWords}
              onSubmitEditing={handlePressSearch}
            />
          </View>

          <View style={[a.flex_1]}>
            <TextField.LabelText>
              <Trans>This exact phrase</Trans>
            </TextField.LabelText>
            <ClearableInput
              label={l`This exact phrase`}
              defaultValue={exactPhrase}
              onChangeText={setExactPhrase}
              onSubmitEditing={handlePressSearch}
            />
          </View>
        </View>

        <View>
          <View style={[a.flex_row, a.gap_lg]}>
            <View style={[a.flex_1]}>
              <TextField.LabelText>
                <Trans>Since</Trans>
              </TextField.LabelText>
              <ClearableDateField
                label={l`Since`}
                value={dateSince}
                active={dateSinceActive}
                accessibilityHint={l({
                  message: 'Include posts made since this date',
                  comment: 'Advanced search filter',
                })}
                // Can't choose a Since later than an active Until.
                maximumDate={dateUntilActive ? dateUntil : DEFAULT_DATE}
                onConfirm={(value: string) => {
                  setDateSince(value)
                  setDateSinceActive(true)
                }}
                onClear={() => {
                  setDateSinceActive(false)
                  setDateSince(DEFAULT_DATE)
                }}
              />
            </View>
            <View style={[a.flex_1]}>
              <TextField.LabelText>
                <Trans>Until</Trans>
              </TextField.LabelText>
              <ClearableDateField
                label={l`Until`}
                value={dateUntil}
                active={dateUntilActive}
                accessibilityHint={l({
                  message: 'Include posts made until this date',
                  comment: 'Advanced search filter',
                })}
                // Can't choose an Until earlier than an active Since.
                minimumDate={dateSinceActive ? dateSince : undefined}
                onConfirm={(value: string) => {
                  setDateUntil(value)
                  setDateUntilActive(true)
                }}
                onClear={() => {
                  setDateUntilActive(false)
                  setDateUntil(DEFAULT_DATE)
                }}
              />
            </View>
          </View>
        </View>

        <View style={[twoColumn ? a.flex_row : a.flex_col, a.gap_lg]}>
          <View style={[a.flex_1]}>
            <Text
              style={[
                a.text_sm,
                a.font_medium,
                t.atoms.text_contrast_medium,
                a.mb_sm,
              ]}>
              <Trans>Language</Trans>
            </Text>
            <View style={[a.flex_row]}>
              <SearchLanguageDropdown value={language} onChange={setLanguage} />
            </View>
          </View>
          <View style={[a.flex_1]}>
            <Text
              style={[
                a.text_sm,
                a.font_medium,
                t.atoms.text_contrast_medium,
                a.mb_sm,
              ]}>
              <Trans>Media</Trans>
            </Text>
            <View style={[a.flex_row]}>
              <MediaDropdown value={media} onChange={setMedia} />
            </View>
          </View>
        </View>

        <View style={[twoColumn ? a.flex_row : a.flex_col, a.gap_lg]}>
          <View style={[a.flex_1]}>
            <Text
              style={[
                a.text_sm,
                a.font_medium,
                t.atoms.text_contrast_medium,
                a.mb_sm,
              ]}>
              <Trans>Include</Trans>
            </Text>
            <View style={[a.flex_row]}>
              <RepliesDropdown value={replies} onChange={setReplies} />
            </View>
          </View>
          <View style={[a.flex_1]}>
            <Text
              style={[
                a.text_sm,
                a.font_medium,
                t.atoms.text_contrast_medium,
                a.mb_sm,
              ]}>
              <Trans>From</Trans>
            </Text>
            <View style={[a.flex_row]}>
              <FollowingDropdown value={following} onChange={setFollowing} />
            </View>
          </View>
        </View>

        <ParaGeographySection
          state={state}
          onChangeState={value => {
            trackParaFilter('state', value)
            setState(value)
          }}
          districtKey={districtKey}
          onChangeDistrictKey={value => {
            trackParaFilter('districtKey', value)
            setDistrictKey(value)
          }}
          cabildeoPhase={cabildeoPhase}
          onChangeCabildeoPhase={value => {
            trackParaFilter('cabildeoPhase', value)
            setCabildeoPhase(value)
          }}
          onSubmitEditing={handlePressSearch}
        />

        <ParaPostMetaSection
          postType={postType}
          onChangePostType={value => {
            trackParaFilter('postType', value)
            setPostType(value)
          }}
          flairsInput={flairsInput}
          onChangeFlairsInput={value => {
            trackParaFilter('flairs', value || undefined)
            setFlairsInput(value)
          }}
          party={party}
          onChangeParty={value => {
            trackParaFilter('party', value)
            setParty(value)
          }}
          verifiedPublicFigure={verifiedPublicFigure}
          onChangeVerifiedPublicFigure={value => {
            trackParaFilter('verifiedPublicFigure', value ? 'true' : undefined)
            setVerifiedPublicFigure(value)
          }}
          onSubmitEditing={handlePressSearch}
        />

        <View ref={filtersSectionRef} style={[a.gap_md]}>
          {filters.map(filter => (
            <FilterBlock
              key={filter.id}
              filter={filter}
              onChange={patch => updateFilter(filter.id, patch)}
              onSubmitEditing={handlePressSearch}
              onRemove={() => removeFilter(filter.id)}
            />
          ))}
          {filters.length >= MAX_FILTERS && (
            <View
              style={[
                a.flex_row,
                a.align_start,
                a.gap_sm,
                a.p_md,
                a.rounded_sm,
                a.border,
                t.atoms.bg,
                t.atoms.border_contrast_high,
              ]}>
              <CircleInfoIcon
                size="md"
                fill={t.atoms.text_contrast_medium.color}
              />
              <Text style={[a.text_sm, a.leading_snug, a.flex_1]}>
                <Trans>
                  You’ve reached the maximum of{' '}
                  <Plural
                    value={MAX_FILTERS}
                    one="# filter"
                    other="# filters"
                  />
                  . Add more values to an existing filter instead of creating
                  new ones.
                </Trans>
              </Text>
            </View>
          )}
          <View style={[a.flex_row, a.gap_sm, a.mt_sm]}>
            <Button
              label={l`Add an additional search filter`}
              size="small"
              color="secondary"
              disabled={filters.length >= MAX_FILTERS}
              onPress={() => addFilter('authors')}>
              <ButtonIcon icon={PlusIcon} />
              <ButtonText>
                <Trans>Add filter</Trans>
              </ButtonText>
            </Button>
            <Menu.Root>
              <Menu.Trigger label={l`Add a PARA entity filter`}>
                {({props}) => (
                  <Button
                    {...props}
                    label={props.accessibilityLabel}
                    size="small"
                    color="secondary"
                    disabled={filters.length >= MAX_FILTERS}>
                    <ButtonText>
                      <Trans>Add PARA filter</Trans>
                    </ButtonText>
                    <ButtonIcon
                      icon={platform({
                        native: ChevronUpDownIcon,
                        default: ChevronDownIcon,
                      })}
                    />
                  </Button>
                )}
              </Menu.Trigger>
              <Menu.Outer>
                <Menu.Group>
                  <Menu.Item
                    label={l`Filter by communities`}
                    onPress={() => addFilter('communities')}>
                    <Menu.ItemText>
                      <Trans>Communities</Trans>
                    </Menu.ItemText>
                  </Menu.Item>
                  <Menu.Item
                    label={l`Filter by cabildeos`}
                    onPress={() => addFilter('cabildeos')}>
                    <Menu.ItemText>
                      <Trans>Cabildeos</Trans>
                    </Menu.ItemText>
                  </Menu.Item>
                  <Menu.Item
                    label={l`Filter by compass positions`}
                    onPress={() => addFilter('compassPositions')}>
                    <Menu.ItemText>
                      <Trans>Compass positions</Trans>
                    </Menu.ItemText>
                  </Menu.Item>
                  <Menu.Item
                    label={l`Filter by policy areas`}
                    onPress={() => addFilter('policyAreas')}>
                    <Menu.ItemText>
                      <Trans>Policy areas</Trans>
                    </Menu.ItemText>
                  </Menu.Item>
                </Menu.Group>
              </Menu.Outer>
            </Menu.Root>
          </View>
        </View>
      </View>
    </Dialog.ScrollableInner>
  )
}
