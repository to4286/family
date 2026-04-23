import { useCallback } from "react";
import { handleCameraImagePick, handleImagePick } from "../utils/imagePicker";

/**
 * 온보딩·홈·프로필 등에서 동일한 갤러리/카메라 픽을 쓰도록 묶은 훅.
 * 크롭 가로:세로는 `STORY_PHOTO_ASPECT` → `../utils/imagePicker`의 `BASE_OPTIONS.aspect`와 동기화됨.
 */
export function useStoryImagePicker() {
  const pickFromLibrary = useCallback(() => handleImagePick(), []);
  const pickFromCamera = useCallback(() => handleCameraImagePick(), []);
  return { pickFromLibrary, pickFromCamera };
}
