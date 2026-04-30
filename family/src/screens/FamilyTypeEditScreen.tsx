import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StyleSheet,
  Modal,
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

const FAMILY_TYPES = [
  "웃음이 가득한 가족",
  "서로 존중하는 가족",
  "배려가 많은 가족",
  "기타 (직접 입력)",
];

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

export default function FamilyTypeEditScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainTabStackParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  const [familyId, setFamilyId] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [customText, setCustomText] = useState("");
  const [initialSelected, setInitialSelected] = useState<number | null>(null);
  const [initialCustom, setInitialCustom] = useState("");

  const lastIndex = FAMILY_TYPES.length - 1;
  const isCustomSelected = selected === lastIndex;
  const hasChanges = selected !== initialSelected || customText !== initialCustom;
  const canSave =
    selected !== null && (isCustomSelected ? customText.trim().length > 0 : true) && hasChanges;

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const isSaving = useRef(false);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  useEffect(() => {
    const fetchFamilyType = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: myMember } = await supabase
          .from("members")
          .select("family_id")
          .eq("auth_uid", user.id)
          .single();

        if (!myMember) return;
        setFamilyId(myMember.family_id);

        const { data: family } = await supabase
          .from("families")
          .select("family_type")
          .eq("id", myMember.family_id)
          .single();

        if (family && family.family_type) {
          const typeText = family.family_type;
          const index = FAMILY_TYPES.findIndex((t) => t === typeText);

          if (index !== -1 && index !== lastIndex) {
            setSelected(index);
            setInitialSelected(index);
          } else {
            // 리스트에 없는 값이면 '기타(직접 입력)' 처리
            setSelected(lastIndex);
            setInitialSelected(lastIndex);
            setCustomText(typeText);
            setInitialCustom(typeText);
          }
        }
      } catch (error) {
        console.log("가족 유형 불러오기 실패:", error);
      }
    };
    fetchFamilyType();
  }, [lastIndex]);

  const handleBackPress = () => {
    if (hasChanges && !isSaving.current) {
      Keyboard.dismiss();
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
    if (!familyId || selected === null) return;
    isSaving.current = true;

    try {
      const familyTypeText =
        selected === lastIndex ? customText.trim() : FAMILY_TYPES[selected];

      const { data, error } = await supabase
        .from("families")
        .update({ family_type: familyTypeText })
        .eq("id", familyId)
        .select();

      if (error) throw error;

      // 권한(RLS) 문제로 업데이트가 무시되어 빈 배열이 돌아오면 에러 강제 발생
      if (!data || data.length === 0) {
        throw new Error("DB 업데이트 권한이 차단되었습니다. (Supabase RLS 정책 필요)");
      }

      // 🚀 무전 신호 발송 후 현재 화면을 닫음 (스택 중첩 원천 차단)
      DeviceEventEmitter.emit("SHOW_MYPAGE_TOAST", {
        icon: "✅",
        text: "가족 유형이 변경되었어요",
      });
      navigation.goBack();
    } catch (error) {
      console.log("가족 유형 변경 실패:", error);
      Alert.alert("오류", "가족 유형 변경에 실패했습니다. 다시 시도해주세요.");
      isSaving.current = false;
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBackPress} activeOpacity={0.6}>
          <ChevronLeftIcon size={32} color={Colors.textSub} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>가족 유형 변경</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={12}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1, backgroundColor: Colors.white }}>
            <View style={styles.floatingHeader}>
              <Text style={styles.screenTitle}>{"어떤 가족이 되고\n싶으신가요?"}</Text>
              <Text style={styles.screenSubtitle}>원하는 모습을 골라주세요</Text>
            </View>

            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollListContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => isCustomSelected && scrollRef.current?.scrollToEnd({ animated: true })}
            >
              <View>
                {FAMILY_TYPES.map((type, i) => {
                  const isSelected = selected === i;
                  const isLast = i === lastIndex;
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => {
                        setSelected(i);
                        Keyboard.dismiss();
                      }}
                      activeOpacity={0.8}
                      style={[
                        styles.familyTypeCard,
                        {
                          borderColor: isSelected ? Colors.accent : Colors.border,
                          borderWidth: isSelected ? 2 : 1,
                          backgroundColor: isSelected ? Colors.accentLight : Colors.white,
                        },
                      ]}
                    >
                      {isLast && isSelected ? (
                        <TextInput
                          value={customText}
                          onChangeText={setCustomText}
                          placeholder="직접 입력해주세요"
                          placeholderTextColor={Colors.textHint}
                          style={[styles.textInput, styles.familyTypeCustomInput]}
                          autoFocus
                        />
                      ) : (
                        <Text
                          style={[
                            styles.familyTypeText,
                            {
                              color: isLast && !customText ? Colors.textHint : Colors.text,
                              fontFamily: isSelected ? "Pretendard-Medium" : "Pretendard-Regular",
                            },
                          ]}
                        >
                          {isLast && customText ? customText : type}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View
              style={[
                styles.bottomBtnArea,
                { paddingBottom: (Platform.OS === "ios" ? 20 : 30) + insets.bottom },
              ]}
            >
              <BtnPrimary
                label="저장하기"
                onPress={handleSave}
                disabled={!canSave}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
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
  topBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  topBarTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
    textAlign: "center",
  },
  floatingHeader: {
    paddingHorizontal: 28,
    backgroundColor: Colors.white,
    zIndex: 10,
    paddingTop: 8,
    paddingBottom: 16,
  },
  screenTitle: { fontSize: 22, fontFamily: "Pretendard-Medium", color: Colors.text, lineHeight: 32, marginBottom: 8 },
  screenSubtitle: { fontSize: 14, fontFamily: "Pretendard-Regular", color: Colors.textSub, lineHeight: 22, marginBottom: 32 },
  scrollListContent: {
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 20,
  },
  bottomBtnArea: {
    paddingHorizontal: 28,
    paddingTop: 12,
    backgroundColor: Colors.white,
  },
  familyTypeCard: {
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  familyTypeText: { fontSize: 15, fontFamily: "Pretendard-Regular" },
  familyTypeCustomInput: { paddingVertical: 0, paddingHorizontal: 0, borderWidth: 0, backgroundColor: "transparent" },
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
