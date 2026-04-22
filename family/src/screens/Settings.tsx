import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Svg, { Path } from "react-native-svg";
import { Colors } from "../constants/colors";

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
          <Text style={styles.modalTitle}>로그아웃</Text>
          <Text style={styles.modalDesc}>정말 로그아웃 하시겠어요?</Text>
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

function WithdrawModal({ visible, onClose }: any) {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [customText, setCustomText] = useState("");

  const isEtc = selected === WITHDRAW_REASONS.length - 1;
  const canNext = selected !== null && (!isEtc || customText.trim().length > 0);

  // 모달 닫힐 때 상태 초기화
  const handleClose = () => {
    setStep(1);
    setSelected(null);
    setCustomText("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleClose}>
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
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleClose}>
                  <Text style={styles.modalConfirmBtnText}>탈퇴하기</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
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
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

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
                  <CustomToggle value={notifs[key]} onValueChange={(val) => setNotifs(prev => ({ ...prev, [key]: val }))} />
                }
              />
            ))}
          </View>
          {!notifAllowed && (
            <View style={styles.notifOverlay}>
              <Text style={styles.overlayIcon}>🔔</Text>
              <Text style={styles.overlayTitle}>알림이 허용되지 않았어요</Text>
              <Text style={styles.overlayDesc}>알림을 받으려면{"\n"}알림 권한을 허용해주세요</Text>
              <TouchableOpacity style={styles.overlayBtn} onPress={() => setNotifAllowed(true)} activeOpacity={0.8}>
                <Text style={styles.overlayBtnText}>설정으로 이동</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 계정 관리 */}
        <SectionHeader title="계정 관리" />
        <View style={styles.accountSection}>
          <RowItem label="연결된 계정" value="Google" />
          <RowItem label="로그아웃" onPress={() => setShowLogoutModal(true)} />
          <RowItem label="회원 탈퇴" danger onPress={() => setShowWithdrawModal(true)} />
        </View>
      </ScrollView>

      {/* 모달 */}
      <LogoutModal visible={showLogoutModal} onClose={() => setShowLogoutModal(false)} onConfirm={() => setShowLogoutModal(false)} />
      <WithdrawModal visible={showWithdrawModal} onClose={() => setShowWithdrawModal(false)} />
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
    backgroundColor: "#D4645A",
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
