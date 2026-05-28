import {
  type ComposerFlair,
  isPolicyFlair,
  normalizeComposerFlairs,
} from '#/lib/post-flairs'
import {
  getOpenQuestionSearchQuery,
  POST_FLAIRS,
  POST_TYPES,
  type PostType,
} from '#/lib/tags'

export type ComposerAutocompleteContext =
  | {
      type: 'mention'
      query: string
      start: number
      end: number
      raw: string
    }
  | {
      type: 'hashtag'
      query: string
      start: number
      end: number
      raw: string
    }
  | {
      type: 'command'
      query: string
      start: number
      end: number
      raw: string
    }

export type CivicAutocompleteItem =
  | {
      key: string
      type: 'policyFlair'
      flair: ComposerFlair
      label: string
      value: string
      searchText: string
    }
  | {
      key: string
      type: 'matterFlair'
      flair: ComposerFlair
      label: string
      value: string
      searchText: string
    }
  | {
      key: string
      type: 'composerCommand'
      command: 'raq' | 'open-question'
      label: string
      value: '/raq' | '/open-question'
      description: string
      postType: PostType
    }

type ApplyCivicAutocompleteItemArgs = {
  item: CivicAutocompleteItem
  text: string
  context: Extract<ComposerAutocompleteContext, {type: 'hashtag' | 'command'}>
  selectedFlairs: ComposerFlair[]
  postType: PostType | null
}

const SPACE_REGEX = /\s+/
const SPECIAL_POST_TYPE_TAGS = [
  POST_TYPES.RAQ.tag,
  POST_TYPES.OPEN_QUESTION.tag,
]

const COMMAND_ITEMS: Extract<
  CivicAutocompleteItem,
  {type: 'composerCommand'}
>[] = [
  {
    key: 'command:raq',
    type: 'composerCommand',
    command: 'raq',
    label: 'RAQ',
    value: '/raq',
    description: 'Mark this post as a RAQ statement',
    postType: POST_TYPES.RAQ,
  },
  {
    key: 'command:open-question',
    type: 'composerCommand',
    command: 'open-question',
    label: 'Open Question',
    value: '/open-question',
    description: 'Mark this post as an open question',
    postType: POST_TYPES.OPEN_QUESTION,
  },
]

export function getComposerAutocompleteContext(
  text: string,
  cursorPos: number,
): ComposerAutocompleteContext | null {
  if (cursorPos < 0 || cursorPos > text.length) {
    return null
  }

  let start = cursorPos
  while (start > 0 && !SPACE_REGEX.test(text[start - 1] ?? '')) {
    start--
  }

  let end = cursorPos
  while (end < text.length && !SPACE_REGEX.test(text[end] ?? '')) {
    end++
  }

  const raw = text.slice(start, end)
  const head = text.slice(start, cursorPos)
  if (!head) return null

  switch (head[0]) {
    case '@':
      return {
        type: 'mention',
        query: head.slice(1),
        start,
        end,
        raw,
      }
    case '#':
      return {
        type: 'hashtag',
        query: head.slice(1),
        start,
        end,
        raw,
      }
    case '/':
      return {
        type: 'command',
        query: head.slice(1),
        start,
        end,
        raw,
      }
    default:
      return null
  }
}

export function getCivicAutocompleteItems(
  context: Extract<ComposerAutocompleteContext, {type: 'hashtag' | 'command'}>,
  limit: number = 8,
): CivicAutocompleteItem[] {
  if (context.type === 'command') {
    const query = normalizeForSearch(context.query)
    return COMMAND_ITEMS.filter(item => {
      if (!query) return true
      return normalizeForSearch(
        `${item.value} ${item.label} ${item.description}`,
      ).includes(query)
    }).slice(0, limit)
  }

  const query = normalizeForSearch(context.query)
  if (!query) return []

  const flairItems: Extract<
    CivicAutocompleteItem,
    {type: 'policyFlair' | 'matterFlair'}
  >[] = Object.values(POST_FLAIRS).map(flair => {
    const itemType = isPolicyFlair(flair) ? 'policyFlair' : 'matterFlair'
    const searchParts = [
      flair.label,
      flair.tag,
      flair.tag.replace(/^\|+#/, ''),
      flair.id.replace(/^(policy_|matter_)/, ''),
    ]
    const searchText = normalizeForSearch(searchParts.join(' '))
    const label = flair.label
    const value = `#${flair.tag.replace(/^\|+#/, '')}`

    return {
      key: flair.id,
      type: itemType,
      flair,
      label,
      value,
      searchText,
    }
  })

  return flairItems
    .filter(item => item.searchText.includes(query))
    .sort((a, b) => compareCivicItems(a, b, query))
    .slice(0, limit)
}

export function applyCivicAutocompleteItem({
  item,
  text,
  context,
  selectedFlairs,
  postType,
}: ApplyCivicAutocompleteItemArgs): {
  nextText: string
  nextSelectedFlairs: ComposerFlair[]
  nextPostType: PostType | null
} {
  const baseText =
    context.type === 'command'
      ? replaceAutocompleteContext(
          text,
          context,
          item.type === 'composerCommand' ? (item.postType.tag ?? '') : '',
        )
      : replaceAutocompleteContext(text, context, '')

  if (item.type === 'composerCommand') {
    return {
      nextText: syncComposerSpecialPostTypeText(baseText, item.postType),
      nextSelectedFlairs: selectedFlairs,
      nextPostType: item.postType,
    }
  }

  const nextSelectedFlairs = normalizeComposerFlairs([
    ...selectedFlairs.filter(flair =>
      item.type === 'policyFlair'
        ? !isPolicyFlair(flair)
        : isPolicyFlair(flair),
    ),
    item.flair,
  ])

  return {
    nextText: baseText,
    nextSelectedFlairs,
    nextPostType: postType,
  }
}

export function syncComposerSpecialPostTypeText(
  text: string,
  postType: PostType | null,
): string {
  const requiredTag =
    postType?.id === POST_TYPES.RAQ.id
      ? POST_TYPES.RAQ.tag
      : postType?.id === POST_TYPES.OPEN_QUESTION.id
        ? POST_TYPES.OPEN_QUESTION.tag
        : null

  if (!requiredTag) {
    return stripComposerSpecialPostTypeTags(text)
  }

  let next = text
  for (const tag of SPECIAL_POST_TYPE_TAGS) {
    if (!tag || tag === requiredTag) continue
    next = next.replace(new RegExp(escapeRegExp(tag), 'g'), ' ')
  }

  let seenRequiredTag = false
  next = next.replace(new RegExp(escapeRegExp(requiredTag), 'g'), () => {
    if (seenRequiredTag) {
      return ' '
    }
    seenRequiredTag = true
    return requiredTag
  })
  next = next
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+\n/g, '\n')
    .trim()

  return next.includes(requiredTag)
    ? next
    : next
      ? `${next} ${requiredTag}`
      : requiredTag
}

export function stripComposerSpecialPostTypeTags(text: string): string {
  let next = text
  for (const tag of SPECIAL_POST_TYPE_TAGS) {
    if (!tag) continue
    next = next.replace(new RegExp(escapeRegExp(tag), 'g'), ' ')
  }

  return next
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+\n/g, '\n')
    .trim()
}

export function replaceAutocompleteContext(
  text: string,
  context: Extract<ComposerAutocompleteContext, {type: 'hashtag' | 'command'}>,
  replacement: string,
): string {
  return `${text.slice(0, context.start)}${replacement}${text.slice(context.end)}`
}

export function isOpenQuestionTextCompatible(text: string): boolean {
  return syncComposerSpecialPostTypeText(
    text,
    POST_TYPES.OPEN_QUESTION,
  ).includes(getOpenQuestionSearchQuery())
}

function compareCivicItems(
  a: CivicAutocompleteItem,
  b: CivicAutocompleteItem,
  query: string,
) {
  const aScore = getMatchScore(a, query)
  const bScore = getMatchScore(b, query)
  if (aScore !== bScore) return aScore - bScore

  if (a.type === 'composerCommand' && b.type !== 'composerCommand') return 1
  if (a.type !== 'composerCommand' && b.type === 'composerCommand') return -1

  return a.label.localeCompare(b.label)
}

function getMatchScore(item: CivicAutocompleteItem, query: string) {
  const searchText =
    item.type === 'composerCommand'
      ? normalizeForSearch(`${item.value} ${item.label} ${item.description}`)
      : item.searchText

  if (searchText.startsWith(query)) return 0
  if (searchText.includes(` ${query}`)) return 1
  return 2
}

function normalizeForSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
