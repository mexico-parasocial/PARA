import '#/logger/sentry/setup' // must be near top
import './style.css'

import {Fragment, useEffect, useState} from 'react'
import {KeyboardProvider as KeyboardControllerProvider} from 'react-native-keyboard-controller'
import {SafeAreaProvider} from 'react-native-safe-area-context'
import {BackgroundNotificationPreferencesProvider} from '@bsky.app/expo-background-notification-handler/src/BackgroundNotificationHandlerProvider'
import {useLingui} from '@lingui/react/macro'

import {Provider as HotkeysProvider} from '#/lib/hotkeys'
import {completeM8WebGrant} from '#/lib/im8/webGrant'
import {QueryProvider} from '#/lib/react-query'
import {ThemeProvider} from '#/lib/ThemeContext'
import {Provider as TranslateOnDeviceProvider} from '#/lib/translation'
import I18nProvider from '#/locale/i18nProvider'
import {logger} from '#/logger'
import {Sentry} from '#/logger/sentry/lib'
import {identifyDevice} from '#/logger/sentry/user'
import {Provider as A11yProvider} from '#/state/a11y'
import {Provider as MutedThreadsProvider} from '#/state/cache/thread-mutes'
import {Provider as DialogStateProvider} from '#/state/dialogs'
import {Provider as EmailVerificationProvider} from '#/state/email-verification'
import {listenSessionDropped} from '#/state/events'
import {HighlightProvider} from '#/state/highlights/HighlightContext'
import {Provider as HomeBadgeProvider} from '#/state/home-badge'
import {MessagesProvider} from '#/state/messages'
import {init as initPersistedState} from '#/state/persisted'
import {Provider as PrefsStateProvider} from '#/state/preferences'
import {BetaUserStorageSync} from '#/state/preferences/beta-user-sync'
import {Provider as LabelDefsProvider} from '#/state/preferences/label-defs'
import {Provider as ModerationOptsProvider} from '#/state/preferences/moderation-opts'
import {Provider as UnreadNotifsProvider} from '#/state/queries/notifications/unread'
import {Provider as ServiceConfigProvider} from '#/state/service-config'
import {
  Provider as SessionProvider,
  type SessionAccount,
  useSession,
  useSessionApi,
} from '#/state/session'
import {readLastActiveAccount} from '#/state/session/util'
import {Provider as ShellStateProvider} from '#/state/shell'
import {Provider as ComposerProvider} from '#/state/shell/composer'
import {Provider as LandingProvider} from '#/state/shell/landing'
import {Provider as LoggedOutViewProvider} from '#/state/shell/logged-out'
import {Provider as OnboardingProvider} from '#/state/shell/onboarding'
import {PoliticalAffiliationProvider} from '#/state/shell/political-affiliation'
import {Provider as ProgressGuideProvider} from '#/state/shell/progress-guide'
import {Provider as SelectedFeedProvider} from '#/state/shell/selected-feed'
import {Provider as HiddenRepliesProvider} from '#/state/threadgate-hidden-replies'
import {Shell} from '#/view/shell/index'
import {ThemeProvider as Alf} from '#/alf'
import {useColorModeTheme} from '#/alf/util/useColorModeTheme'
import {Provider as ContextMenuProvider} from '#/components/ContextMenu'
import {useLandingEntry} from '#/components/hooks/useLandingEntry'
import {Provider as IntentDialogProvider} from '#/components/intents/IntentDialogs'
import {Provider as LightboxStateProvider} from '#/components/Lightbox/state'
import {Provider as PolicyUpdateOverlayProvider} from '#/components/PolicyUpdateOverlay'
import {Provider as PortalProvider} from '#/components/Portal'
import {Provider as ActiveVideoProvider} from '#/components/Post/Embed/VideoEmbed/ActiveVideoWebContext'
import {Provider as VideoVolumeProvider} from '#/components/Post/Embed/VideoEmbed/VideoVolumeContext'
import * as Toast from '#/components/Toast'
import {ToastOutlet} from '#/components/Toast'
import {
  // prefetchAgeAssuranceConfig,
  Provider as AgeAssuranceV2Provider,
} from '#/ageAssurance'
import {
  AnalyticsContext,
  AnalyticsFeaturesContext,
  features,
  setupDeviceId,
} from '#/analytics'
import {getDeviceId} from '#/analytics/identifiers'
import {
  completeMatrixWebAuthorization,
  MATRIX_OIDC_CALLBACK_PATH,
} from '#/features/encryptedChat/webOidc'
import {
  // prefetchLiveEvents,
  Provider as LiveEventsProvider,
} from '#/features/liveEvents/context'
import * as Geo from '#/geolocation'
import {Splash} from '#/Splash'
import {HideBottomBarBorderProvider} from './lib/hooks/useHideBottomBarBorder'

void identifyDevice(getDeviceId(), setupDeviceId)

/**
 * Begin geolocation ASAP
 */
// Geo.resolve()
// prefetchAgeAssuranceConfig()
// prefetchLiveEvents()

function InnerApp() {
  const [isReady, setIsReady] = useState(false)
  const {currentAccount} = useSession()
  const {resumeSession, logoutCurrentAccount} = useSessionApi()
  const theme = useColorModeTheme()
  const {t: l} = useLingui()
  const hasCheckedLanding = useLandingEntry()

  // init
  useEffect(() => {
    async function onLaunch(account?: SessionAccount) {
      try {
        if (account) {
          await resumeSession(account)
        } else {
          await features.init
        }
      } catch (e) {
        logger.warn(`session: resumeSession failed`, {message: e})
      }
      setIsReady(true)
    }
    const account = readLastActiveAccount()
    void onLaunch(account)
  }, [resumeSession])

  useEffect(() => {
    return listenSessionDropped(() => {
      Toast.show(l`Sorry! Your session expired. Please sign in again.`, {
        type: 'info',
      })
      logoutCurrentAccount('Settings')
    })
  }, [l, logoutCurrentAccount])

  // wait for session to resume
  return (
    <Alf theme={theme}>
      <ThemeProvider theme={theme}>
        <ContextMenuProvider>
          <Splash isReady={isReady && hasCheckedLanding}>
            <VideoVolumeProvider>
              <ActiveVideoProvider>
                <Fragment
                  // Resets the entire tree below when it changes:
                  key={currentAccount?.did}>
                  <AnalyticsFeaturesContext>
                    <QueryProvider currentDid={currentAccount?.did}>
                      <BetaUserStorageSync />
                      <PolicyUpdateOverlayProvider>
                        <LiveEventsProvider>
                          <AgeAssuranceV2Provider>
                            <ComposerProvider>
                              <MessagesProvider>
                                {/* LabelDefsProvider MUST come before ModerationOptsProvider */}
                                <LabelDefsProvider>
                                  <ModerationOptsProvider>
                                    <LoggedOutViewProvider>
                                      <SelectedFeedProvider>
                                        <HiddenRepliesProvider>
                                          <HomeBadgeProvider>
                                            <UnreadNotifsProvider>
                                              <BackgroundNotificationPreferencesProvider>
                                                <MutedThreadsProvider>
                                                  <SafeAreaProvider>
                                                    <ProgressGuideProvider>
                                                      <ServiceConfigProvider>
                                                        <EmailVerificationProvider>
                                                          <HideBottomBarBorderProvider>
                                                            <IntentDialogProvider>
                                                              <TranslateOnDeviceProvider>
                                                                <HotkeysProvider>
                                                                  <Shell />
                                                                  <ToastOutlet />
                                                                </HotkeysProvider>
                                                              </TranslateOnDeviceProvider>
                                                            </IntentDialogProvider>
                                                          </HideBottomBarBorderProvider>
                                                        </EmailVerificationProvider>
                                                      </ServiceConfigProvider>
                                                    </ProgressGuideProvider>
                                                  </SafeAreaProvider>
                                                </MutedThreadsProvider>
                                              </BackgroundNotificationPreferencesProvider>
                                            </UnreadNotifsProvider>
                                          </HomeBadgeProvider>
                                        </HiddenRepliesProvider>
                                      </SelectedFeedProvider>
                                    </LoggedOutViewProvider>
                                  </ModerationOptsProvider>
                                </LabelDefsProvider>
                              </MessagesProvider>
                            </ComposerProvider>
                          </AgeAssuranceV2Provider>
                        </LiveEventsProvider>
                      </PolicyUpdateOverlayProvider>
                    </QueryProvider>
                  </AnalyticsFeaturesContext>
                </Fragment>
              </ActiveVideoProvider>
            </VideoVolumeProvider>
          </Splash>
        </ContextMenuProvider>
      </ThemeProvider>
    </Alf>
  )
}

function App() {
  const [isReady, setReady] = useState(false)

  useEffect(() => {
    void Promise.all([
      initPersistedState().then(async () => {
        try {
          const returnTo = await completeM8WebGrant(
            () => readLastActiveAccount()?.did,
          )
          // The router mounts after this callback; retain its in-memory grant.
          if (returnTo) window.history.replaceState(null, '', returnTo)
        } catch {
          logger.error('m8: authorization callback initialization failed')
          if (window.location.pathname === '/m8-auth')
            window.location.replace('/')
        }
      }),
      setupDeviceId,
      // The homeserver's OAuth redirect lands on MATRIX_OIDC_CALLBACK_PATH with
      // an authorization code in the query string. Exchange it here, before the
      // app renders: the router has no such route, and a code must not sit in a
      // URL the app has started navigating from. On any other path this is a
      // no-op. A failure must not block boot — chat then just asks again.
      completeMatrixWebAuthorization()
        .then(returnTo => {
          if (!returnTo) return
          // A full navigation rather than a history replace: the SPA booted on
          // the callback path, so there is no screen to re-render into.
          window.location.replace(returnTo)
        })
        .catch(err => {
          logger.error('matrix: authorization callback failed', {
            safeMessage: err,
          })
          if (window.location.pathname === MATRIX_OIDC_CALLBACK_PATH) {
            window.location.replace('/')
          }
        }),
    ]).then(() => setReady(true))
  }, [])

  if (!isReady) {
    return <Splash isReady={false} />
  }

  /*
   * NOTE: only nothing here can depend on other data or session state, since
   * that is set up in the InnerApp component above.
   */
  return (
    <Geo.Provider>
      <A11yProvider>
        <KeyboardControllerProvider>
          <OnboardingProvider>
            <AnalyticsContext>
              <SessionProvider>
                <PrefsStateProvider>
                  <I18nProvider>
                    <ShellStateProvider>
                      <DialogStateProvider>
                        <LightboxStateProvider>
                          <PortalProvider>
                            <HighlightProvider>
                              <LandingProvider>
                                <PoliticalAffiliationProvider>
                                  <InnerApp />
                                </PoliticalAffiliationProvider>
                              </LandingProvider>
                            </HighlightProvider>
                          </PortalProvider>
                        </LightboxStateProvider>
                      </DialogStateProvider>
                    </ShellStateProvider>
                  </I18nProvider>
                </PrefsStateProvider>
              </SessionProvider>
            </AnalyticsContext>
          </OnboardingProvider>
        </KeyboardControllerProvider>
      </A11yProvider>
    </Geo.Provider>
  )
}

export default Sentry.wrap(App)
