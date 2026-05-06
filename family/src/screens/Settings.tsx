import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import Constants from "expo-constants";
let Notifications: any = null;
try {
  const isExpoGoAndroid = Constants.appOwnership === "expo" && Platform.OS === "android";
  if (!isExpoGoAndroid) {
    Notifications = require("expo-notifications");
  }
} catch (e) {
  console.log("expo-notifications 로드 불가 (Expo Go 환경)");
}
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Svg, { Path } from "react-native-svg";
import type { User } from "@supabase/supabase-js";
import { Colors } from "../constants/colors";
import { supabase } from "../utils/supabase";

const CONNECTED_PROVIDER_LABELS: Record<string, string> = {
  apple: "Apple",
  google: "Google",
  naver: "NAVER",
};

/** 네이버는 매직링크(signIn)이라 identity가 email일 수 있음 → Edge에서 심은 user_metadata.provider 우선 */
function getConnectedAccountLabel(user: User | null): string {
  if (!user) return "";

  const metaRaw = user.user_metadata?.provider;
  if (typeof metaRaw === "string") {
    const key = metaRaw.toLowerCase();
    if (CONNECTED_PROVIDER_LABELS[key]) return CONNECTED_PROVIDER_LABELS[key];
  }

  const nonEmailIdentity = user.identities?.find((id) => {
    const p = id.provider?.toLowerCase();
    return p && p !== "email" && p !== "phone";
  });
  const fromIdentity = nonEmailIdentity?.provider?.toLowerCase();
  const appProv =
    typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider.toLowerCase() : undefined;

  const key = fromIdentity ?? appProv;
  if (!key) return "";
  return CONNECTED_PROVIDER_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

// --- 상수 및 데이터 ---
const NOTIF_SETTINGS = [
  { key: "mood", label: "기분 변경 알림" },
  { key: "story", label: "스토리 등록 알림" },
  { key: "album", label: "앨범 사진 등록 알림" },
  { key: "comment", label: "앨범 댓글 알림" },
  { key: "story_comment", label: "스토리 댓글 알림" },
  { key: "poke", label: "콕 찌르기 알림" },
];

const WITHDRAW_REASONS = [
  "앱을 잘 사용하지 않아서",
  "가족과 사이가 멀어져서",
  "사용하기 불편해서",
  "기타 (직접 입력)",
];

// --- 공통 컴포넌트 ---
function ChevronLeftIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CustomToggle({ value, onValueChange }: { value: boolean; onValueChange: (val: boolean) => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onValueChange(!value)}
      style={[styles.toggleTrack, { backgroundColor: value ? Colors.accent : Colors.border }]}
    >
      <View style={[styles.toggleKnob, { alignSelf: value ? "flex-end" : "flex-start" }]} />
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function RowItem({ label, value, onPress, danger, rightElement }: any) {
  return (
    <TouchableOpacity
      style={styles.rowItem}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Text style={[styles.rowLabel, danger && { color: "#D4645A" }]}>{label}</Text>
      {rightElement ? (
        rightElement
      ) : (
        <View style={styles.rowRight}>
          {value && <Text style={styles.rowValue}>{value}</Text>}
          {onPress && <Text style={styles.chevron}>›</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
}

// --- 모달 컴포넌트 ---
function LogoutModal({ visible, onClose, onConfirm }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
          <Text style={[styles.modalTitle, { marginBottom: 28 }]}>로그아웃 하시겠습니까?</Text>
          <View style={styles.modalBtnRow}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalConfirmBtn} onPress={onConfirm}>
              <Text style={styles.modalConfirmBtnText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function WithdrawModal({
  visible,
  onClose,
  onWithdraw,
}: {
  visible: boolean;
  onClose: () => void;
  onWithdraw: () => void;
}) {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [customText, setCustomText] = useState("");
  // 🚀 키보드 상태를 추적하는 State 추가
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const isEtc = selected === WITHDRAW_REASONS.length - 1;
  const canNext = selected !== null && (!isEtc || customText.trim().length > 0);

  useEffect(() => {
    if (visible) {
      setStep(1);
      setSelected(null);
      setCustomText("");
    }
  }, [visible]);

  // 🚀 키보드가 켜지고 꺼짐을 실시간으로 감지
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleClose = () => {
    onClose();
  };

  // 🚀 배경 터치 시 스마트하게 분기 처리하는 함수 추가
  const handleOverlayPress = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss(); // 키보드가 켜져 있으면 키보드만 내림
    } else {
      handleClose(); // 키보드가 없으면 모달 전체를 닫음
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      {/* 1. 전체 화면 딤(modalOverlay) — KeyboardAvoidingView 바깥에 두어 흰 배경 노출 방지 */}
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleOverlayPress}>
        {/* 2. 흰 카드(modalCard)만 키보드에 맞춰 위로 밀기 */}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            {step === 1 ? (
              <>
                <Text style={styles.modalTitle}>떠나시는 이유를 알려주세요</Text>
                <Text style={styles.modalDesc}>더 나은 서비스를 위해 활용할게요</Text>
                <View style={styles.reasonList}>
                  {WITHDRAW_REASONS.map((reason, i) => (
                    <View key={i}>
                      <TouchableOpacity
                        style={[
                          styles.reasonItem,
                          selected === i && styles.reasonItemActive,
                        ]}
                        onPress={() => {
                          setSelected(i);
                          if (i !== WITHDRAW_REASONS.length - 1) setCustomText("");
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.reasonText, selected === i && styles.reasonTextActive]}>{reason}</Text>
                      </TouchableOpacity>
                      {i === WITHDRAW_REASONS.length - 1 && isEtc && (
                        <TextInput
                          style={styles.customInput}
                          value={customText}
                          onChangeText={setCustomText}
                          placeholder="직접 입력해주세요"
                          placeholderTextColor={Colors.textHint}
                          autoFocus
                        />
                      )}
                    </View>
                  ))}
                </View>
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={handleClose}>
                    <Text style={styles.modalCancelBtnText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, !canNext && { backgroundColor: Colors.border }]}
                    onPress={() => canNext && setStep(2)}
                    disabled={!canNext}
                  >
                    <Text style={styles.modalConfirmBtnText}>다음</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>정말 탈퇴하시겠어요?</Text>
                <Text style={styles.modalDesc}>탈퇴 시 모든 데이터가 삭제되며{"\n"}복구할 수 없어요</Text>
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setStep(1)}>
                    <Text style={styles.modalCancelBtnText}>이전</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirmBtn}
                    onPress={() => {
                      handleClose();
                      onWithdraw();
                    }}
                  >
                    <Text style={styles.modalConfirmBtnText}>탈퇴하기</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

// --- 메인 설정 스크린 ---
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [notifAllowed, setNotifAllowed] = useState(false);
  const [notifs, setNotifs] = useState<Record<string, boolean>>({
    mood: true,
    story: true,
    album: true,
    comment: true,
    story_comment: true,
    poke: true,
  });
  const [myMemberId, setMyMemberId] = useState<number | null>(null);
  const [linkedAccountLabel, setLinkedAccountLabel] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const checkPermissionAndLoad = async () => {
        if (Notifications) {
          const { status } = await Notifications.getPermissionsAsync();
          setNotifAllowed(status === "granted");
        } else {
          setNotifAllowed(false);
        }

        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          setLinkedAccountLabel(getConnectedAccountLabel(user));

          const { data: myMember } = await supabase
            .from("members")
            .select("id")
            .eq("auth_uid", user.id)
            .single();

          if (!myMember) return;
          setMyMemberId(myMember.id);

          const { data: settings } = await supabase
            .from("member_settings")
            .select("*")
            .eq("member_id", myMember.id)
            .single();

          if (settings) {
            setNotifs({
              mood: settings.notif_mood ?? true,
              story: settings.notif_story ?? true,
              album: settings.notif_album ?? true,
              comment: settings.notif_comment ?? true,
              story_comment: settings.notif_story_comment ?? true,
              poke: settings.notif_poke ?? true,
            });
          }
        } catch (e) {
          console.log("설정 로드 실패:", e);
        }
      };

      checkPermissionAndLoad();
    }, [])
  );

  const persistNotifToggle = useCallback(async (key: string, val: boolean) => {
    setNotifs((prev) => ({ ...prev, [key]: val }));
    if (!myMemberId) return;
    await supabase
      .from("member_settings")
      .update({ [`notif_${key}`]: val })
      .eq("member_id", myMemberId);
  }, [myMemberId]);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await supabase.auth.signOut();
    navigation.reset({
      index: 0,
      routes: [{ name: "OnboardingStack" as never }],
    });
  };

  const handleWithdraw = async () => {
    // 🚀 모달 페이드아웃 애니메이션(약 300ms)이 부드럽게 끝날 수 있도록 딜레이 후 탈퇴 로직 실행
    setTimeout(async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: myMember } = await supabase
          .from("members")
          .select("id, family_id")
          .eq("auth_uid", user.id)
          .single();

        if (!myMember) return;

        const profilePath = `${user.id}/profile.jpg`;
        await supabase.storage.from("profiles").remove([profilePath]);

        const { data: storyFiles } = await supabase.storage.from("stories").list(String(myMember.id));
        if (storyFiles && storyFiles.length > 0) {
          const storyPaths = storyFiles.map((f) => `${myMember.id}/${f.name}`);
          await supabase.storage.from("stories").remove(storyPaths);
        }

        await supabase.from("member_settings").delete().eq("member_id", myMember.id);

        const { data: deletedData, error: deleteError } = await supabase
          .from("members")
          .delete()
          .eq("id", myMember.id)
          .select();

        if (deleteError) throw deleteError;

        if (!deletedData || deletedData.length === 0) {
          throw new Error("DB 삭제 권한이 차단되었습니다. (Supabase RLS DELETE 정책 필요)");
        }

        // 가족 구성원 전원 탈퇴 시 앨범 Storage 자동 정리
        const cleanupFamilyAlbumFn = "cleanup-family-album";
        await supabase.functions.invoke(cleanupFamilyAlbumFn, {
          body: { family_id: myMember.family_id },
        });

        await supabase.auth.signOut();
        navigation.reset({
          index: 0,
          routes: [{ name: "OnboardingStack" as never }],
        });
      } catch (e) {
        console.log("회원 탈퇴 실패:", e);
        Alert.alert("오류", "탈퇴 처리 중 문제가 발생했어요. 다시 시도해주세요.");
      }
    }, 300);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* AlbumDetail.tsx와 동일한 헤더 적용 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.6}>
          <ChevronLeftIcon size={32} color={Colors.textSub} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>설정</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 알림 설정 */}
        <SectionHeader title="알림 설정" />
        <View style={styles.notifSectionWrap}>
          <View style={[styles.notifList, !notifAllowed && { opacity: 0.3 }]} pointerEvents={notifAllowed ? "auto" : "none"}>
            {NOTIF_SETTINGS.map(({ key, label }) => (
              <RowItem
                key={key}
                label={label}
                rightElement={
                  <CustomToggle value={notifs[key]} onValueChange={(val) => persistNotifToggle(key, val)} />
                }
              />
            ))}
          </View>
          {!notifAllowed && (
            <View style={styles.notifOverlay}>
              <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" style={styles.overlayIcon}>
                <Path
                  d="M8.35206 20.242C8.78721 20.7922 9.34171 21.2364 9.97367 21.541C10.6056 21.8455 11.2985 22.0025 12.0001 22C12.7016 22.0025 13.3945 21.8455 14.0264 21.541C14.6584 21.2364 15.2129 20.7922 15.6481 20.242C13.2271 20.5697 10.773 20.5697 8.35206 20.242ZM18.7501 9V9.704C18.7501 10.549 18.9901 11.375 19.4421 12.078L20.5501 13.801C21.5611 15.375 20.7891 17.514 19.0301 18.011C14.4338 19.3127 9.56635 19.3127 4.97006 18.011C3.21106 17.514 2.43906 15.375 3.45006 13.801L4.55806 12.078C5.01127 11.3692 5.25178 10.5453 5.25106 9.704V9C5.25106 5.134 8.27306 2 12.0001 2C15.7271 2 18.7501 5.134 18.7501 9Z"
                  fill={Colors.accent}
                />
              </Svg>
              <Text style={styles.overlayTitle}>알림이 허용되지 않았어요</Text>
              <Text style={styles.overlayDesc}>알림을 받으려면{"\n"}알림 권한을 허용해주세요</Text>
              <TouchableOpacity style={styles.overlayBtn} onPress={() => Linking.openSettings()} activeOpacity={0.8}>
                <Text style={styles.overlayBtnText}>설정으로 이동</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 계정 관리 */}
        <SectionHeader title="계정 관리" />
        <View style={styles.accountSection}>
          <RowItem label="연결된 계정" value={linkedAccountLabel || "—"} />
          <RowItem label="로그아웃" onPress={() => setShowLogoutModal(true)} />
          <RowItem label="회원 탈퇴" danger onPress={() => setShowWithdrawModal(true)} />
        </View>
      </ScrollView>

      {/* 모달 */}
      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
      <WithdrawModal
        visible={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        onWithdraw={handleWithdraw}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white }, // Colors.bg에서 변경
  // 헤더 스타일 (AlbumDetail과 동일)
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white, // Colors.bg에서 변경
  },
  headerTitle: {
    flex: 1,
    fontSize: 18, // 16에서 18로 변경
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
    textAlign: "center",
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  
  // 섹션 헤더
  sectionHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
    fontSize: 13,
    fontFamily: "Pretendard-Medium",
    color: Colors.textHint,
  },
  
  // 리스트 아이템
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: Colors.white,
  },
  rowLabel: {
    fontSize: 16,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowValue: {
    fontSize: 15,
    fontFamily: "Pretendard-Regular",
    color: Colors.textSub,
    marginRight: 6,
  },
  chevron: {
    fontSize: 20,
    color: Colors.textHint,
  },

  // 토글 스위치
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },

  // 알림 오버레이
  notifSectionWrap: {
    position: "relative",
  },
  notifList: {
    backgroundColor: Colors.white,
  },
  notifOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  overlayIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  overlayTitle: {
    fontSize: 17,
    fontFamily: "NanumSquareRound-Bold",
    color: Colors.text,
    marginBottom: 6,
  },
  overlayDesc: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.textSub,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  overlayBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
  },
  overlayBtnText: {
    fontSize: 15,
    fontFamily: "Pretendard-Medium",
    color: Colors.white,
  },

  accountSection: {
    backgroundColor: Colors.white,
  },

  // 모달 공통
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(46,34,22,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: 320,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.textSub,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.text,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: "center",
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontFamily: "Pretendard-Medium",
    color: Colors.white,
  },

  // 탈퇴 모달 리스트
  reasonList: {
    marginBottom: 20,
    gap: 8,
  },
  reasonItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  reasonItemActive: {
    borderColor: "#D4645A",
    backgroundColor: "#FFF0EE",
  },
  reasonText: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.text,
  },
  reasonTextActive: {
    fontFamily: "Pretendard-Medium",
    color: "#D4645A",
  },
  customInput: {
    marginTop: 8,
    width: "100%",
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D4645A",
    backgroundColor: Colors.bg,
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.text,
  },
});
