import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

/**
 * 이미지를 리사이즈 + 압축하여 로컬 URI를 반환
 * - 가로 기준 1080px 리사이즈 (원본이 더 작으면 그대로)
 * - JPEG 80% 품질 압축
 */
export async function compressImage(
  uri: string,
  maxWidth: number = 1080,
  quality: number = 0.8
): Promise<string> {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    { compress: quality, format: SaveFormat.JPEG }
  );
  return result.uri;
}
