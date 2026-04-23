/**
 * 스토리(홈), 댓글 시트 미리보기, expo-image-picker 갤러리/카메라 크롭의 공통 가로:세로 비율.
 * UI와 피커를 맞출 때 이 상수만 수정하면 됩니다.
 */
export const STORY_PHOTO_ASPECT: [number, number] = [4, 3];

/** `StyleSheet`의 `aspectRatio`에 사용 */
export const STORY_PHOTO_ASPECT_RATIO = STORY_PHOTO_ASPECT[0] / STORY_PHOTO_ASPECT[1];
