import { Alert, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";

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
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("사진첩 권한 안내", "사진을 공유하려면 사진첩 접근 권한이 필요해요. 기기 설정에서 권한을 허용해 주세요.", [
      { text: "취소", style: "cancel" },
      { text: "설정으로 이동", onPress: () => Linking.openSettings() },
    ]);
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
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("카메라 권한 안내", "촬영하려면 카메라 접근 권한이 필요해요. 기기 설정에서 권한을 허용해 주세요.", [
      { text: "취소", style: "cancel" },
      { text: "설정으로 이동", onPress: () => Linking.openSettings() },
    ]);
    return null;
  }
  const result = await ImagePicker.launchCameraAsync(BASE_OPTIONS);
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}

/**
 * 갤러리에서 여러 장의 이미지 선택 (앨범 다중 추가용)
 * @returns uri와 표시용 생성일 문자열(YYYY년 M월 d일) 배열, 취소/실패 시 null
 */
export async function handleMultipleImagePick(): Promise<{ uri: string; date: string }[] | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("알림", "갤러리에 접근하려면 사진 권한이 필요합니다. 설정에서 허용해 주세요.");
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    orderedSelection: true,
    quality: 1,
    exif: true, // EXIF 메타데이터 요청
  });

  if (result.canceled) return null;

  // 생성일(creationTime)을 정확히 가져오기 위해 MediaLibrary 권한 체크 (iOS 다중 선택 시 EXIF 누락 방지)
  const { status } = await MediaLibrary.requestPermissionsAsync();

  const photos = await Promise.all(
    result.assets.map(async (asset) => {
      let dateStr = "";

      // 1. MediaLibrary를 통해 정확한 원본 생성일 가져오기
      if (asset.assetId && status === "granted") {
        try {
          const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.assetId);
          if (assetInfo && assetInfo.creationTime) {
            const d = new Date(assetInfo.creationTime);
            dateStr = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
          }
        } catch (e) {
          // 권한 오류 시 무시하고 2단계로 넘어감
        }
      }

      // 2. 실패 시 이미지 EXIF 메타데이터에서 추출
      if (!dateStr && asset.exif) {
        const exif = asset.exif as Record<string, string | undefined>;
        const exifDate = exif.DateTimeOriginal || exif.DateTime;
        if (exifDate) {
          const parts = exifDate.split(" ")[0]!.split(":");
          if (parts.length === 3) {
            dateStr = `${parts[0]!}년 ${parseInt(parts[1]!, 10)}월 ${parseInt(parts[2]!, 10)}일`;
          }
        }
      }

      // 3. 메타데이터가 아예 없는 사진일 경우 오늘 날짜로 폴백
      if (!dateStr) {
        const today = new Date();
        dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
      }

      return { uri: asset.uri, date: dateStr };
    })
  );

  return photos;
}
