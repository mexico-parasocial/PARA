import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {fireEvent, render, screen} from '@testing-library/react-native'

import {
  type FollowThroughOfCabildeo,
  type FollowThroughView,
} from '#/lib/api/follow-through'
import {FollowThroughSection} from '../components/FollowThroughSection'

const CABILDEO = 'at://did:plc:a/com.para.civic.cabildeo/1'
const mockRefetchList = jest.fn()
const mockRefetchItem = jest.fn()
let mockList: {data?: FollowThroughOfCabildeo; isError?: boolean}
let mockItem: {
  data?: FollowThroughView | null
  isLoading?: boolean
  isError?: boolean
}
const mockListEnabled = jest.fn()

jest.mock('#/state/queries/follow-through', () => ({
  useFollowThroughQuery: (_uri: string, opts: {enabled?: boolean}) => {
    mockListEnabled(opts.enabled)
    return {refetch: mockRefetchList, ...mockList}
  },
  useFollowThroughItemQuery: () => ({refetch: mockRefetchItem, ...mockItem}),
}))
jest.mock('#/state/queries/profile', () => ({
  useProfileQuery: () => ({data: undefined}),
}))
jest.mock('#/alf', () => ({
  atoms: {},
  useTheme: () => ({
    atoms: {},
    palette: {
      negative_500: '#c00',
      positive_500: '#060',
      primary_500: '#00c',
      contrast_100: '#ddd',
      contrast_500: '#888',
      yellow: '#cc0',
    },
  }),
}))
jest.mock('#/components/Typography', () => ({
  Text: jest.requireActual('react-native').Text,
}))

function item(
  slug: string,
  fields: Partial<FollowThroughView> = {},
): FollowThroughView {
  return {
    uri: `at://did:plc:a/com.para.civic.followThrough/${slug}`,
    cid: slug,
    author: 'did:plc:a',
    cabildeo: CABILDEO,
    communityUri: 'at://did:plc:a/com.para.community.board/b',
    optionIndex: 0,
    title: `Compromiso ${slug}`,
    status: 'in_progress',
    overdue: false,
    rescheduledCount: 0,
    edited: false,
    createdAt: '2026-10-01T00:00:00.000Z',
    ...fields,
  }
}

const summary = {
  cabildeo: CABILDEO,
  total: 4,
  completed: 1,
  overdue: 1,
  abandoned: 0,
} as FollowThroughOfCabildeo['summary'] & object

const four = ['uno', 'dos', 'tres', 'cuatro'].map(s => item(s))

function renderSection(resolved = true) {
  return render(
    <I18nProvider i18n={i18n}>
      <FollowThroughSection cabildeoUri={CABILDEO} resolved={resolved} />
    </I18nProvider>,
  )
}

beforeEach(() => {
  i18n.loadAndActivate({locale: 'en', messages: {}})
  mockRefetchList.mockReset()
  mockRefetchItem.mockReset()
  mockListEnabled.mockReset()
  mockList = {data: {items: four, summary}}
  mockItem = {}
})

describe('FollowThroughSection', () => {
  it('draws nothing and does not ask for a cabildeo that is not resolved', () => {
    renderSection(false)
    expect(screen.queryByText('Seguimiento')).toBeNull()
    expect(mockListEnabled).toHaveBeenLastCalledWith(false)
  })

  it('draws nothing when the AppView serves no compromiso', () => {
    mockList = {data: {items: [], summary: null}}
    renderSection()
    expect(screen.queryByText('Seguimiento')).toBeNull()
  })

  it('shows counts from the summary and the first three compromisos', () => {
    renderSection()
    expect(screen.getByText('Seguimiento')).toBeTruthy()
    expect(screen.getByText('Cumplidos: 1 de 4')).toBeTruthy()
    expect(screen.getByText('Atrasados: 1')).toBeTruthy()
    expect(screen.getByText('Compromiso tres')).toBeTruthy()
    expect(screen.queryByText('Compromiso cuatro')).toBeNull()
  })

  it('reveals the rest on request and folds them again', () => {
    renderSection()
    fireEvent.press(screen.getByLabelText('Ver los 4 compromisos'))
    expect(screen.getByText('Compromiso cuatro')).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Ver menos compromisos'))
    expect(screen.queryByText('Compromiso cuatro')).toBeNull()
  })

  it('draws no overall bar unless the AppView derived a progress', () => {
    renderSection()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('draws the overall bar when it did', () => {
    mockList = {data: {items: four, summary: {...summary, progress: 55}}}
    renderSection()
    expect(screen.getByLabelText('Avance general: 55%')).toBeTruthy()
  })

  it('draws a compromiso bar only for a declared progress', () => {
    mockList = {
      data: {
        items: [item('con', {progress: 40}), item('sin')],
        summary: null,
      },
    }
    renderSection()
    expect(screen.getAllByRole('progressbar')).toHaveLength(1)
    expect(screen.getByLabelText('Avance: 40%')).toBeTruthy()
  })

  it('marks an overdue compromiso apart from its status', () => {
    mockList = {data: {items: [item('tarde', {overdue: true})], summary: null}}
    renderSection()
    expect(screen.getByText('En curso')).toBeTruthy()
    expect(screen.getByText('Atrasado')).toBeTruthy()
  })

  it('keeps sub-compromisos under their parent', () => {
    mockList = {
      data: {
        items: [item('madre', {children: [item('hija')]})],
        summary: null,
      },
    }
    renderSection()
    expect(screen.getByText('Compromiso madre')).toBeTruthy()
    expect(screen.getByText('Compromiso hija')).toBeTruthy()
  })

  it('offers a retry instead of an empty section when the read fails', () => {
    mockList = {isError: true}
    renderSection()
    fireEvent.press(screen.getByLabelText('Reintentar'))
    expect(mockRefetchList).toHaveBeenCalledTimes(1)
  })
})

describe('compromiso detail', () => {
  const open = () =>
    fireEvent.press(screen.getAllByRole('button', {name: 'Compromiso uno'})[0])

  beforeEach(() => {
    mockList = {data: {items: [item('uno')], summary: null}}
  })

  it('lists updates newest first, as written', () => {
    mockItem = {
      data: item('uno', {
        updates: [
          {
            uri: 'u1',
            author: 'did:plc:a',
            status: 'in_progress',
            progress: 20,
            note: 'Primera nota',
            evidenceUris: [],
            edited: false,
            occurredAt: '2026-10-02T00:00:00.000Z',
            createdAt: '2026-10-02T00:00:00.000Z',
          },
          {
            uri: 'u2',
            author: 'did:plc:a',
            status: 'completed',
            progress: 100,
            note: 'Segunda nota',
            evidenceUris: [],
            edited: true,
            occurredAt: '2026-10-09T00:00:00.000Z',
            createdAt: '2026-10-09T00:00:00.000Z',
          },
        ],
      } as Partial<FollowThroughView>),
    }
    renderSection()
    open()
    const notes = screen
      .getAllByText(/nota$/)
      .map(n => (n.props.children as string) ?? '')
    expect(notes).toEqual(['Segunda nota', 'Primera nota'])
    expect(
      screen.getByText(
        'Editada después de publicarse. Se muestra la original.',
      ),
    ).toBeTruthy()
  })

  it('says when a compromiso was edited and when updates were deleted', () => {
    mockList = {
      data: {
        items: [item('uno', {edited: true, withdrawnUpdates: 1})],
        summary: null,
      },
    }
    mockItem = {data: item('uno', {updates: []})}
    renderSection()
    open()
    expect(
      screen.getByText(
        'Este compromiso se editó después de publicarse. Se muestra la versión original.',
      ),
    ).toBeTruthy()
    expect(
      screen.getByText('1 actualización se publicó y luego se borró.'),
    ).toBeTruthy()
  })

  it('does not claim silence while the timeline is loading or failed', () => {
    mockItem = {isLoading: true}
    renderSection()
    open()
    expect(screen.getByText('Cargando actualizaciones…')).toBeTruthy()
    expect(screen.queryByText('Aún no hay actualizaciones.')).toBeNull()
  })

  it('retries a failed timeline', () => {
    mockItem = {isError: true}
    renderSection()
    open()
    fireEvent.press(screen.getByLabelText('Reintentar'))
    expect(mockRefetchItem).toHaveBeenCalledTimes(1)
  })

  it('says so when there are no updates yet', () => {
    mockItem = {data: item('uno', {updates: []})}
    renderSection()
    open()
    expect(screen.getByText('Aún no hay actualizaciones.')).toBeTruthy()
  })
})
