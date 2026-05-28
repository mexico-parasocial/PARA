import {type TextInput} from 'react-native'
import {type RichText} from '@atproto/api'

import {type ComposerFlair} from '#/lib/post-flairs'
import {type PostType} from '#/lib/tags'

export type TextInputRef = {
  focus: () => void
  blur: () => void
  /**
   * @platform web
   */
  getCursorPosition: () =>
    | {left: number; right: number; top: number; bottom: number}
    | undefined
  /**
   * Closes the autocomplete popup if it is open.
   * Returns `true` if the popup was closed, `false` otherwise.
   *
   * @platform web
   */
  maybeClosePopup: () => boolean
}

export type TextInputProps = {
  ref: React.Ref<TextInputRef>
  richtext: RichText
  webForceMinHeight: boolean
  hasRightPadding: boolean
  isActive: boolean
  civicAutocompleteEnabled: boolean
  selectedFlairs: ComposerFlair[]
  postType: PostType | null
  setRichText: (v: RichText) => void
  setSelectedFlairs: (flairs: ComposerFlair[]) => void
  setPostType: (postType: PostType | null) => void
  onPhotoPasted: (uri: string) => void
  onPressPublish: (richtext: RichText) => void
  onNewLink: (uri: string) => void
  onError: (err: string) => void
  onFocus: () => void
} & Pick<
  React.ComponentProps<typeof TextInput>,
  | 'placeholder'
  | 'autoFocus'
  | 'style'
  | 'accessible'
  | 'accessibilityLabel'
  | 'accessibilityHint'
>
