import {type CompressedVideo} from '#/lib/media/video/types'
import {createChunkReader} from './readChunk'

const mockBytes = Uint8Array.from([0, 1, 2, 3, 4, 5])
const mockHandle = {
  offset: 0,
  readBytesSync(size: number) {
    return mockBytes.slice(this.offset, this.offset + size)
  },
  close: jest.fn(),
}

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({open: () => mockHandle})),
}))

test('reads concurrent chunks from their requested offsets', async () => {
  const reader = createChunkReader({uri: 'file:///video'} as CompressedVideo)
  const [later, earlier] = await Promise.all([
    reader.read(3, 2),
    reader.read(0, 3),
  ])
  expect(later).toEqual(Uint8Array.from([3, 4]))
  expect(earlier).toEqual(Uint8Array.from([0, 1, 2]))
  reader.close()
  expect(mockHandle.close).toHaveBeenCalledTimes(1)
})
