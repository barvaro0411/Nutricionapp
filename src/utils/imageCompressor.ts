import * as ImageManipulator from "expo-image-manipulator";

export interface CompressedImageResult {
  uri: string;
  width: number;
  height: number;
}

/**
 * Comprime y redimensiona la imagen de la comida en el dispositivo antes de subirla.
 * - Limita el ancho/alto a un máximo de 1024px conservando el aspect ratio.
 * - Formato JPEG con compresión 0.7.
 * - Reduce drásticamente el peso a < 300-600 KB para ahorrar datos, tiempo y costos de tokens.
 */
export async function compressMealImage(uri: string): Promise<CompressedImageResult> {
  const manipulatedImage = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return {
    uri: manipulatedImage.uri,
    width: manipulatedImage.width,
    height: manipulatedImage.height,
  };
}
