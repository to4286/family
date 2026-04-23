/**
 * HomeScreen, Mypage 등 탭 화면 토스트 UI 공통 값.
 * 위치·슬라이드 애니메이션을 한곳에서 맞춥니다.
 */
export const TOAST_SLIDE_OFFSCREEN_PX = 100;
export const TOAST_ANIM_MS = 300;
/** 토스트가 보인 뒤 사라지기 전까지 머무는 시간 */
export const TOAST_DISPLAY_MS = 1500;
/** 탭바 위 토스트 하단 offset (하단 탭·세이프와 맞춤) */
export const TOAST_CONTAINER_BOTTOM = 130;

/** 홈: 내 스토리 사진 추가 완료 */
export const TOAST_STORY_UPLOADED: { icon: string; text: string } = {
  icon: "✅",
  text: "새로운 스토리가 업로드되었어요",
};
