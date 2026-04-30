import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Modal,
  Image,
  Alert,
  DeviceEventEmitter,
} from "react-native";
import { File } from "expo-file-system/next";
import { decode } from "base64-arraybuffer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";
import { Colors } from "../constants/colors";
import type { MainTabStackParamList } from "../navigation/types";
import { useStoryImagePicker } from "../hooks/useStoryImagePicker";
import PhotoSelectionModal from "../components/PhotoSelectionModal";
import { supabase } from "../utils/supabase";
import { compressImage } from "../utils/imageCompress";

function ChevronLeftIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function BtnPrimary({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.8}
      style={[styles.btnPrimary, { backgroundColor: disabled ? Colors.border : Colors.accent }]}
    >
      <Text style={styles.btnPrimaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ProfilePhotoEditScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainTabStackParamList>>();
  const { pickFromLibrary, pickFromCamera } = useStoryImagePicker();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<number | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isChanged, setIsChanged] = useState(false);
  const hasPhoto = imageUri != null;
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const isSaving = useRef(false);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("members")
          .select("id, profile_image_url")
          .eq("auth_uid", user.id)
          .single();

        if (data) {
          setMemberId(data.id);
          if (data.profile_image_url) {
            setImageUri(data.profile_image_url);
          }
        }
      } catch (error) {
        console.log("프로필 불러오기 실패:", error);
      }
    };
    fetchProfileData();
  }, []);

  const handleBackPress = () => {
    if (isChanged && !isSaving.current) {
      setShowExitConfirm(true);
    } else {
      navigation.goBack();
    }
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    navigation.goBack();
  };

  const handleSave = async () => {
    if (!memberId || !imageUri) return;
    isSaving.current = true;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인 정보를 찾을 수 없습니다.");

      let publicUrl = imageUri;

      // 🚀 사진이 변경되었다면 무조건 업로드 실행 (isChanged 기준)
      if (isChanged) {
        const compressedUri = await compressImage(imageUri);
        const file = new File(compressedUri);
        const base64 = await file.base64();

        if (!base64) throw new Error("이미지 변환 실패");

        // 🚀 고유한 파일명을 생성하여 RLS(권한) 충돌을 방지하고 캐시 문제를 해결함
        const storagePath = `${user.id}/profile_${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("profiles")
          .upload(storagePath, decode(base64), {
            contentType: "image/jpeg",
            upsert: false, // 고유한 이름이므로 덮어쓰기가 아닌 신규 생성으로 처리
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("profiles").getPublicUrl(storagePath);
        publicUrl = urlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from("members")
        .update({ profile_image_url: publicUrl })
        .eq("id", memberId);

      if (updateError) throw updateError;

      // 🚀 무전 신호 발송 후 현재 화면을 닫음 (스택 중첩 원천 차단)
      DeviceEventEmitter.emit("SHOW_MYPAGE_TOAST", {
        icon: "✅",
        text: "프로필 사진이 변경되었어요",
      });
      navigation.goBack();
    } catch (error) {
      console.log("프로필 사진 변경 실패:", error);
      Alert.alert("오류", "프로필 사진 변경에 실패했습니다. 다시 시도해주세요.");
      isSaving.current = false;
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBackPress} activeOpacity={0.6}>
          <ChevronLeftIcon size={32} color={Colors.textSub} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>프로필 사진 변경</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.screen}>
        <Text style={styles.screenTitle}>{"프로필 사진을\n설정해주세요"}</Text>
        <Text style={[styles.screenSubtitle, { marginBottom: 48 }]}>가족들에게 보여질 사진이에요</Text>
        <View style={styles.photoSection}>
          <TouchableOpacity onPress={() => setShowPhotoModal(true)} activeOpacity={0.8}>
            <View
              style={[
                styles.photoCircle,
                {
                  backgroundColor: hasPhoto ? Colors.surface : Colors.bg,
                  borderColor: hasPhoto ? Colors.accent : Colors.border,
                  overflow: "hidden",
                },
              ]}
            >
              {hasPhoto ? (
                <Image source={{ uri: imageUri! }} style={styles.profilePickImage} resizeMode="cover" />
              ) : (
                <Text style={styles.photoPlusIcon}>+</Text>
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>터치해서 사진 변경</Text>
        </View>
        <BtnPrimary
          label="저장하기"
          onPress={handleSave}
          disabled={!isChanged}
        />
        <PhotoSelectionModal
          visible={showPhotoModal}
          onClose={() => setShowPhotoModal(false)}
          onSelectAlbum={async () => {
            const uri = await pickFromLibrary();
            if (uri) {
              setImageUri(uri);
              setIsChanged(true);
            }
          }}
          onTakePhoto={async () => {
            const uri = await pickFromCamera();
            if (uri) {
              setImageUri(uri);
              setIsChanged(true);
            }
          }}
        />
      </View>

      <Modal visible={showExitConfirm} transparent animationType="fade" onRequestClose={() => setShowExitConfirm(false)}>
        <View style={[StyleSheet.absoluteFillObject, styles.exitLayerRoot]} pointerEvents="box-none">
          <TouchableWithoutFeedback onPress={() => setShowExitConfirm(false)}>
            <View style={[StyleSheet.absoluteFillObject, styles.exitLayerDim]} />
          </TouchableWithoutFeedback>
          <View style={styles.exitLayerCenter} pointerEvents="box-none">
            <View style={styles.exitCard}>
              <Text style={styles.exitTitle}>수정을 그만할까요?</Text>
              <Text style={styles.exitSubtitle}>지금 나가면 수정한 내용이 사라져요.</Text>
              <View style={styles.exitBtnRow}>
                <TouchableOpacity
                  style={[styles.exitBtn, styles.exitBtnSecondary]}
                  onPress={() => setShowExitConfirm(false)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.exitBtnSecondaryText}>닫기</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.exitBtn, styles.exitBtnPrimary]}
                  onPress={handleConfirmExit}
                  activeOpacity={0.85}
                >
                  <Text style={styles.exitBtnPrimaryText}>그만하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
    textAlign: "center",
  },
  screen: { flex: 1, paddingHorizontal: 28, paddingBottom: 40, paddingTop: 40 },
  screenTitle: { fontSize: 22, fontFamily: "Pretendard-Medium", color: Colors.text, lineHeight: 32, marginBottom: 8 },
  screenSubtitle: { fontSize: 14, fontFamily: "Pretendard-Regular", color: Colors.textSub, lineHeight: 22, marginBottom: 32 },
  photoSection: { flex: 1, alignItems: "center", gap: 20 },
  photoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  profilePickImage: { width: 120, height: 120 },
  photoPlusIcon: { fontSize: 60, color: Colors.textHint, fontWeight: "200", marginTop: -4 },
  photoHint: { fontSize: 13, fontFamily: "Pretendard-Regular", color: Colors.textHint },
  btnPrimary: { paddingVertical: 16, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontSize: 16, fontFamily: "Pretendard-Medium", color: Colors.white },
  exitLayerRoot: { zIndex: 50 },
  exitLayerDim: { backgroundColor: "rgba(0, 0, 0, 0.35)" },
  exitLayerCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  exitCard: { backgroundColor: Colors.white, borderRadius: 24, padding: 22, overflow: "visible", width: "100%" },
  exitTitle: {
    fontSize: 18,
    fontFamily: "NanumSquareRound-Bold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 10,
  },
  exitSubtitle: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.textSub,
    textAlign: "center",
    marginBottom: 22,
    lineHeight: 20,
  },
  exitBtnRow: { flexDirection: "row", gap: 10 },
  exitBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  exitBtnSecondary: { backgroundColor: Colors.surface },
  exitBtnSecondaryText: { fontSize: 15, fontFamily: "NanumSquareRound-Bold", color: Colors.text },
  exitBtnPrimary: { backgroundColor: Colors.accent },
  exitBtnPrimaryText: { fontSize: 15, fontFamily: "NanumSquareRound-Bold", color: Colors.white },
});
