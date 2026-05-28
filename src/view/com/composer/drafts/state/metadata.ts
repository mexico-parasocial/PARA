import AsyncStorage from '@react-native-async-storage/async-storage'

import {type ComposerFlair, findPostTypeById} from '#/lib/post-flairs'
import {type PostDraft} from '#/view/com/composer/state/composer'
import {logger} from './logger'

const STORAGE_PREFIX = 'composer-draft-metadata'

type DraftPostMetadata = {
  flairs: ComposerFlair[]
  postTypeId: string | null
  isOfficial: boolean
}

type DraftMetadata = {
  posts: DraftPostMetadata[]
}

function getStorageKey(draftId: string) {
  return `${STORAGE_PREFIX}:${draftId}`
}

export async function saveDraftMetadata(draftId: string, posts: PostDraft[]) {
  try {
    const metadata: DraftMetadata = {
      posts: posts.map(post => ({
        flairs: post.flairs,
        postTypeId: post.postType?.id ?? null,
        isOfficial: post.isOfficial,
      })),
    }

    await AsyncStorage.setItem(getStorageKey(draftId), JSON.stringify(metadata))
  } catch (error) {
    logger.warn('Failed to save draft metadata', {draftId, error})
  }
}

export async function loadDraftMetadata(
  draftId: string,
): Promise<DraftMetadata | undefined> {
  try {
    const raw = await AsyncStorage.getItem(getStorageKey(draftId))
    if (!raw) return undefined
    return JSON.parse(raw) as DraftMetadata
  } catch (error) {
    logger.warn('Failed to load draft metadata', {draftId, error})
    return undefined
  }
}

export async function deleteDraftMetadata(draftId: string) {
  try {
    await AsyncStorage.removeItem(getStorageKey(draftId))
  } catch (error) {
    logger.warn('Failed to delete draft metadata', {draftId, error})
  }
}

export function applyDraftMetadata(
  posts: PostDraft[],
  metadata?: DraftMetadata,
) {
  if (!metadata?.posts?.length) {
    return posts
  }

  return posts.map((post, index) => {
    const postMetadata = metadata.posts[index]
    if (!postMetadata) {
      return post
    }

    return {
      ...post,
      flairs: postMetadata.flairs || [],
      postType: findPostTypeById(postMetadata.postTypeId) ?? null,
      isOfficial: postMetadata.isOfficial ?? false,
    }
  })
}
