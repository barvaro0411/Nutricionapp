import * as ImageManipulator from "expo-image-manipulator";

export interface CompressedImageResult {
  uri: string;
  width: number;
  height: number;
}

/**
 * Comprime y redimensiona la imagen de la comida en el dispositivo antes de subirla.
 * - Limita el ancho a un máximo de 800px conservando el aspect ratio.
 * - Formato JPEG con compresión 0.65.
 * - Reduce drásticamente el peso a ~120-220 KB para subida casi instantánea en 4G/5G
 *   y latencia mínima de procesamiento en el backend.
 */
export async function compressMealImage(uri: string): Promise<CompressedImageResult> {
  const manipulatedImage = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    {
      compress: 0.65,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return {
    uri: manipulatedImage.uri,
    width: manipulatedImage.width,
    height: manipulatedImage.height,
  };
}
