/**
 * iOS: `Modal`이 닫힌 뒤 `expo-image-picker`를 연다. `runAfterInteractions` 뒤에 이(ms)만큼 더 쉼
 * (Modal fade·언마운트와 `UIImagePicker` present가 겹치면 피커가 뜨지 않는 경우가 있음)
 */
export const IMAGE_PICKER_OPEN_DELAY_MS = 550;
