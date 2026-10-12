import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {act, fireEvent, render, screen} from '@testing-library/react-native'

import {useModeratorActions} from '../useModeratorActions'

/*
 * A moderator is always asked before muting, and the toast says what the chat
 * server did, not merely that the request completed: the bridge records a
 * sanction even when the homeserver refuses it.
 */

const mockOpen = jest.fn()
jest.mock('#/components/Prompt', () => {
  const {Pressable, Text} = jest.requireActual('react-native')
  return {
    usePromptControl: () => ({open: mockOpen, close: jest.fn()}),
    Basic: ({title, confirmButtonCta, onConfirm}: any) => (
      <Pressable
        accessibilityLabel={`confirm: ${title}`}
        accessibilityHint=""
        onPress={onConfirm}>
        <Text>{confirmButtonCta}</Text>
      </Pressable>
    ),
  }
})

const mockToast = jest.fn()
jest.mock('#/components/Toast', () => ({
  show: (...args: unknown[]) => mockToast(...args),
}))

jest.mock('#/state/session', () => ({
  useSession: () => ({currentAccount: {did: 'did:plc:moderator'}}),
}))

const mockApply = jest.fn()
const mockLift = jest.fn()
jest.mock('#/state/queries/matrix', () => ({
  useApplySanctionMutation: () => ({mutateAsync: mockApply, isPending: false}),
  useLiftSanctionMutation: () => ({mutateAsync: mockLift, isPending: false}),
}))

i18n.loadAndActivate({locale: 'es', messages: {}})

const COMMUNITY = 'at://did:plc:creator/com.para.community.board/one'
const ANA = {did: 'did:plc:ana', name: 'Ana'}
const HOUR = {label: '1 h', minutes: 60}

let actions!: ReturnType<typeof useModeratorActions>
function Harness() {
  actions = useModeratorActions(COMMUNITY)
  return <>{actions.prompts}</>
}

function mount() {
  render(
    <I18nProvider i18n={i18n}>
      <Harness />
    </I18nProvider>,
  )
}

const enforcement = (status: string) => ({
  status,
  accounts: 1,
  applied: status === 'applied' ? 1 : 0,
  failed: status === 'applied' || status === 'pending' ? 0 : 1,
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('muting', () => {
  it('asks first and does nothing until the moderator confirms', () => {
    mount()
    act(() => actions.askMute(ANA, HOUR))
    expect(mockOpen).toHaveBeenCalledTimes(1)
    expect(mockApply).not.toHaveBeenCalled()
    expect(mockToast).not.toHaveBeenCalled()
  })

  it('sends the mute for the chosen time once confirmed', async () => {
    mockApply.mockResolvedValue({enforcement: enforcement('applied')})
    mount()
    act(() => actions.askMute(ANA, HOUR))
    await act(async () => {
      fireEvent.press(screen.getByLabelText(/^confirm: ¿Silenciar a Ana/))
    })
    expect(mockApply).toHaveBeenCalledWith({
      targetDid: ANA.did,
      sanctionedByDid: 'did:plc:moderator',
      communityUri: COMMUNITY,
      type: 'mute',
      durationMinutes: 60,
    })
  })

  it('says it worked only when the chat server applied it', async () => {
    mockApply.mockResolvedValue({enforcement: enforcement('applied')})
    mount()
    act(() => actions.askMute(ANA, HOUR))
    await act(async () => {
      fireEvent.press(screen.getByLabelText(/^confirm: ¿Silenciar/))
    })
    expect(mockToast).toHaveBeenCalledWith(
      expect.stringContaining('Ana silenciado'),
      {type: 'success'},
    )
  })

  it('tells the moderator when the member has no chat account yet', async () => {
    mockApply.mockResolvedValue({enforcement: enforcement('pending')})
    mount()
    act(() => actions.askMute(ANA, HOUR))
    await act(async () => {
      fireEvent.press(screen.getByLabelText(/^confirm: ¿Silenciar/))
    })
    expect(mockToast).toHaveBeenCalledWith(
      expect.stringContaining('Se aplicará cuando Ana entre al chat'),
      {type: 'warning'},
    )
  })

  it.each(['partial', 'failed'])(
    'does not report success when enforcement was %s',
    async status => {
      mockApply.mockResolvedValue({enforcement: enforcement(status)})
      mount()
      act(() => actions.askMute(ANA, HOUR))
      await act(async () => {
        fireEvent.press(screen.getByLabelText(/^confirm: ¿Silenciar/))
      })
      expect(mockToast).toHaveBeenCalledTimes(1)
      const [text, options] = mockToast.mock.calls[0]
      expect(options.type).toBe('error')
      expect(text).toContain('no lo aplicó en todas las salas')
      expect(text).not.toContain('silenciado por')
    },
  )

  it("shows the bridge's refusal, such as sanctioning an owner", async () => {
    mockApply.mockRejectedValue(new Error('An owner cannot be sanctioned'))
    mount()
    act(() => actions.askMute(ANA, HOUR))
    await act(async () => {
      fireEvent.press(screen.getByLabelText(/^confirm: ¿Silenciar/))
    })
    expect(mockToast).toHaveBeenCalledWith('An owner cannot be sanctioned', {
      type: 'error',
    })
  })
})

describe('lifting', () => {
  it('asks first, then lifts the kind that is in force', async () => {
    mockLift.mockResolvedValue({
      lifted: true,
      enforcement: enforcement('applied'),
    })
    mount()
    act(() => actions.askLift(ANA, 'ban'))
    expect(mockLift).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.press(
        screen.getByLabelText(/^confirm: ¿Levantar la restricción/),
      )
    })
    expect(mockLift).toHaveBeenCalledWith({
      targetDid: ANA.did,
      communityUri: COMMUNITY,
      type: 'ban',
    })
    expect(mockToast).toHaveBeenCalledWith(
      expect.stringContaining('Restricción levantada para Ana'),
      {type: 'success'},
    )
  })

  it('says so, and invites a retry, when Matrix could not be updated', async () => {
    mockLift.mockResolvedValue({
      lifted: true,
      enforcement: enforcement('failed'),
    })
    mount()
    act(() => actions.askLift(ANA))
    await act(async () => {
      fireEvent.press(screen.getByLabelText(/^confirm: ¿Levantar/))
    })
    const [text, options] = mockToast.mock.calls[0]
    expect(options.type).toBe('error')
    expect(text).toContain('Inténtalo de nuevo')
  })
})
