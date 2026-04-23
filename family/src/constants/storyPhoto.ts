/**
 * 스토리(홈), 댓글 시트 미리보기 등 이미지 영역의 공통 가로:세로 비율(원본은 그대로 두고 `resizeMode`+`aspectRatio`로 맞춤).
 */
export const STORY_PHOTO_ASPECT: [number, number] = [4, 3];

/** `StyleSheet`의 `aspectRatio`에 사용 */
export const STORY_PHOTO_ASPECT_RATIO = STORY_PHOTO_ASPECT[0] / STORY_PHOTO_ASPECT[1];
