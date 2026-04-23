import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

/** 갤러리/카메라 공통: 네이티브 자르기 UI 없이 원본 반환. 4:3 프레이밍은 홈 `photoImage` 등 UI에서 `resizeMode`+`aspectRatio`로 처리 */
const BASE_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: false,
  quality: 1,
};

/**
 * 갤러리에서 이미지 1장 선택. 권한 거부 시 Alert 안내.
 * @returns 선택된 로컬 file:// URI, 취소/실패 시 null
 */
export async function handleImagePick(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("알림", "갤러리에 접근하려면 사진 권한이 필요합니다. 설정에서 허용해 주세요.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync(BASE_OPTIONS);
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}

/**
 * 카메라로 촬영. 권한 거부 시 Alert 안내.
 */
export async function handleCameraImagePick(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("알림", "카메라를 사용하려면 카메라 권한이 필요합니다.");
    return null;
  }
  const result = await ImagePicker.launchCameraAsync(BASE_OPTIONS);
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}
