import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Modal,
  Keyboard,
  Alert,
  DeviceEventEmitter,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";
import { Colors } from "../constants/colors";
import type { MainTabStackParamList } from "../navigation/types";
import { supabase } from "../utils/supabase";

const MAX_NICKNAME = 6;

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

export default function NicknameEditScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainTabStackParamList>>();

  const [nickname, setNickname] = useState("");
  const [initialNickname, setInitialNickname] = useState("");
  const [memberId, setMemberId] = useState<number | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const isSaving = useRef(false);
  const hasChanges = nickname !== initialNickname;

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  useEffect(() => {
    const fetchNickname = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("members")
          .select("id, nickname")
          .eq("auth_uid", user.id)
          .single();

        if (data) {
          setMemberId(data.id);
          setNickname(data.nickname || "");
          setInitialNickname(data.nickname || "");
        }
      } catch (error) {
        console.log("닉네임 불러오기 실패:", error);
      }
    };
    fetchNickname();
  }, []);

  const handleBackPress = () => {
    if (hasChanges && !isSaving.current) {
      Keyboard.dismiss();
      setShowExitConfirm(true);
    } else {
      navigation.goBack();
    }
  };

  const handleSave = async () => {
    if (!memberId) return;
    isSaving.current = true;

    try {
      const updatedNickname = nickname.trim();
      const { error } = await supabase
        .from("members")
        .update({ nickname: updatedNickname })
        .eq("id", memberId);

      if (error) throw error;

      // 🚀 무전 신호 발송 후 현재 화면을 닫음 (스택 중첩 원천 차단)
      DeviceEventEmitter.emit("SHOW_MYPAGE_TOAST", {
        icon: "✅",
        text: "닉네임이 변경되었어요",
      });
      navigation.goBack();
    } catch (error) {
      console.log("닉네임 변경 실패:", error);
      Alert.alert("오류", "닉네임 변경에 실패했습니다. 다시 시도해주세요.");
      isSaving.current = false;
    }
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    navigation.goBack();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBackPress} activeOpacity={0.6}>
          <ChevronLeftIcon size={32} color={Colors.textSub} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>닉네임 변경</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.screen}>
          <Text style={[styles.screenTitle, { marginBottom: 40 }]}>어떻게 불러드릴까요?</Text>
          <View>
            <TextInput
              value={nickname}
              onChangeText={(text) => setNickname(text.slice(0, MAX_NICKNAME))}
              placeholder="닉네임 입력"
              placeholderTextColor={Colors.textHint}
              style={[styles.textInput, { borderColor: nickname ? Colors.accent : Colors.border }]}
              autoFocus
            />
            <Text style={styles.inputCounter}>
              {nickname.length}/{MAX_NICKNAME}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <BtnPrimary
            label="저장하기"
            onPress={handleSave}
            disabled={!hasChanges || nickname.trim().length === 0}
          />
        </View>
      </KeyboardAvoidingView>

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
  textInput: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: Colors.bg,
    fontSize: 16,
    fontFamily: "Pretendard-Regular",
    color: Colors.text,
  },
  inputCounter: { fontSize: 12, fontFamily: "Pretendard-Regular", color: Colors.textHint, textAlign: "right", marginTop: 6 },
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
