import {type PropsWithChildren} from 'react'

import {Provider as AltTextRequiredProvider} from './alt-text-required'
import {Provider as AutoplayProvider} from './autoplay'
import {Provider as DisableHapticsProvider} from './disable-haptics'
import {Provider as ExternalEmbedsProvider} from './external-embeds-prefs'
import {Provider as HiddenPostsProvider} from './hidden-posts'
import {Provider as InAppBrowserProvider} from './in-app-browser'
import {Provider as KawaiiProvider} from './kawaii'
import {Provider as LanguagesProvider} from './languages'
import {Provider as LargeAltBadgeProvider} from './large-alt-badge'
import {Provider as ShowAuthorInsigniasProvider} from './show-author-insignias'
import {Provider as ShowPartyShieldsProvider} from './show-party-shields'
import {Provider as SubtitlesProvider} from './subtitles'
import {Provider as TrendingSettingsProvider} from './trending'
import {Provider as UsedStarterPacksProvider} from './used-starter-packs'

export {
  useRequireAltTextEnabled,
  useSetRequireAltTextEnabled,
} from './alt-text-required'
export {useAutoplayDisabled, useSetAutoplayDisabled} from './autoplay'
export {useHapticsDisabled, useSetHapticsDisabled} from './disable-haptics'
export {
  useExternalEmbedsPrefs,
  useSetExternalEmbedPref,
} from './external-embeds-prefs'
export {useHiddenPosts, useHiddenPostsApi} from './hidden-posts'
export {useLabelDefinitions} from './label-defs'
export {useLanguagePrefs, useLanguagePrefsApi} from './languages'
export {
  useSetShowAuthorInsignias,
  useShowAuthorInsignias,
} from './show-author-insignias'
export {useSetShowPartyShields, useShowPartyShields} from './show-party-shields'
export {useSetSubtitlesEnabled, useSubtitlesEnabled} from './subtitles'

export function Provider({children}: PropsWithChildren<{}>) {
  return (
    <LanguagesProvider>
      <AltTextRequiredProvider>
        <LargeAltBadgeProvider>
          <ExternalEmbedsProvider>
            <HiddenPostsProvider>
              <InAppBrowserProvider>
                <DisableHapticsProvider>
                  <AutoplayProvider>
                    <UsedStarterPacksProvider>
                      <SubtitlesProvider>
                        <TrendingSettingsProvider>
                          <ShowPartyShieldsProvider>
                            <ShowAuthorInsigniasProvider>
                              <KawaiiProvider>{children}</KawaiiProvider>
                            </ShowAuthorInsigniasProvider>
                          </ShowPartyShieldsProvider>
                        </TrendingSettingsProvider>
                      </SubtitlesProvider>
                    </UsedStarterPacksProvider>
                  </AutoplayProvider>
                </DisableHapticsProvider>
              </InAppBrowserProvider>
            </HiddenPostsProvider>
          </ExternalEmbedsProvider>
        </LargeAltBadgeProvider>
      </AltTextRequiredProvider>
    </LanguagesProvider>
  )
}
