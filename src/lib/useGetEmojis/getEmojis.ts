import Emojis, {type EmojiMartData} from '@emoji-mart/data'

export function getEmojis(): Promise<EmojiMartData> {
  return Promise.resolve(Emojis as EmojiMartData)
}
