import { useCallback } from "react";
import { handleCameraImagePick, handleImagePick } from "../utils/imagePicker";

/**
 * 온보딩·홈·프로필 등에서 동일한 갤러리/카메라 픽을 쓰도록 묶은 훅.
 * 4:3 보기는 `STORY_PHOTO_ASPECT_RATIO`·`photoImage` 스타일로만 맞춤(피커는 원본 URI만 반환).
 */
export function useStoryImagePicker() {
  const pickFromLibrary = useCallback(() => handleImagePick(), []);
  const pickFromCamera = useCallback(() => handleCameraImagePick(), []);
  return { pickFromLibrary, pickFromCamera };
}
