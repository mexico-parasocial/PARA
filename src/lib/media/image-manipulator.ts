import {
  ImageManipulator,
  type ImageManipulatorContext,
  type ImageRef,
  type ImageResult,
  type SaveOptions,
} from 'expo-image-manipulator'

/** Render and save an image, releasing Expo's shared objects after each pass. */
export async function renderImage(
  source: string,
  transform: (context: ImageManipulatorContext) => void,
  options: SaveOptions = {},
): Promise<ImageResult> {
  const context = ImageManipulator.manipulate(source)
  let image: ImageRef | undefined

  try {
    transform(context)
    image = await context.renderAsync()
    return await image.saveAsync(options)
  } finally {
    image?.release()
    context.release()
  }
}
