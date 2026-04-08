import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/colors";

// ─── Types ────────────────────────────────────────────────────────────────────

type Member = {
  id: number;
  emoji: string;
  nickname: string;
  role: string;
  hasDot: boolean;
  isMine: boolean;
  isParent: boolean;
  currentMood: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTempMessage(temp: number) {
  return (
    TEMP_MESSAGES.find((m) => temp >= m.range[0] && temp <= m.range[1]) ??
    TEMP_MESSAGES[1]
  );
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

// ─── Static Data ──────────────────────────────────────────────────────────────

const MEMBERS: Member[] = [
  { id: 1, emoji: "👨", nickname: "김철수", role: "든든한 버팀목", hasDot: true,  isMine: false, isParent: true,  currentMood: 1 },
  { id: 2, emoji: "👩", nickname: "이영희", role: "따뜻한 햇살",   hasDot: false, isMine: false, isParent: true,  currentMood: 0 },
  { id: 3, emoji: "🧒", nickname: "민준",   role: "복덩이 자녀",  hasDot: true,  isMine: true,  isParent: false, currentMood: 2 },
  { id: 4, emoji: "👦", nickname: "지수",   role: "복덩이 자녀",  hasDot: false, isMine: false, isParent: false, currentMood: 2 },
  { id: 5, emoji: "👧", nickname: "하은",   role: "복덩이 자녀",  hasDot: true,  isMine: false, isParent: false, currentMood: 3 },
];

const MOODS = [
  { icon: "🌟", label: "너무 행복해!" },
  { icon: "☀️",  label: "기분 좋아~"  },
  { icon: "☁️", label: "그냥 그래"   },
  { icon: "⛈️", label: "힘들어"      },
];

const TEMP_MESSAGES = [
  { range: [0,  25],  line1: "가족과 오랫동안 대화가 없었네요",    line2: "사소한 안부가 큰 위로가 돼요"         },
  { range: [26, 50],  line1: "서로에 대해 얼마나 알고 있나요?",    line2: "가까울수록 오히려 모르는 게 있어요"  },
  { range: [51, 75],  line1: "가족과 나누는 대화가 늘고 있어요",   line2: "자주 나눌수록 더 편안한 가족이 돼요" },
  { range: [76, 100], line1: "활발하게 소통하고 있는 게 느껴져요", line2: "서로에게 가장 큰 힘이 되고 있어요!"  },
];

const TEMP_REWARDS = [
  { temp: 50,  received: false },
  { temp: 75,  received: false },
  { temp: 100, received: false },
];

const TEMP_ACTIONS = [
  { label: "기분 아이콘 확인", val: "+3°"  },
  { label: "컨셉 질문 답변",  val: "+5°"  },
  { label: "앨범 사진 등록",  val: "+10°" },
];

// ─── Layout Constants ─────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get("window").width;
const ROOF_H   = Math.round(SCREEN_W / 3); // 3:1 비율

const CARD_H   = 150;
const CARD_W   = 160;
const CARD_GAP = 16;
const TUBE_H   = 200;

const PARENTS    = MEMBERS.filter((m) => m.isParent);
const CHILDREN   = MEMBERS.filter((m) => !m.isParent);
const CHILD_ROWS = chunkArray(CHILDREN, 2);

// ─── ThermoMini ───────────────────────────────────────────────────────────────

function ThermoMini({ percent }: { percent: number }) {
  const fillH = Math.round((percent / 100) * 36);
  return (
    <View style={styles.thermoMini}>
      <View style={styles.thermoTube}>
        <View style={[styles.thermoFill, { height: fillH }]} />
      </View>
      <View style={styles.thermoBulb} />
    </View>
  );
}

// ─── MemberCard ───────────────────────────────────────────────────────────────

function MemberCard({ member, onPress }: { member: Member; onPress: (m: Member) => void }) {
  return (
    <TouchableOpacity onPress={() => onPress(member)} activeOpacity={0.85} style={styles.memberCard}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberEmoji}>{member.emoji}</Text>
        {member.hasDot && <View style={styles.memberDot} />}
      </View>
      <Text style={styles.memberNickname}>{member.nickname}</Text>
      <Text style={styles.memberRole}>{member.role}</Text>
    </TouchableOpacity>
  );
}

// ─── MemberModal ──────────────────────────────────────────────────────────────

function MemberModal({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const [selectedMood, setSelectedMood] = useState(2);
  // fade-out 애니메이션 중 member가 null이 되어도 마지막 데이터 유지
  const lastMember = useRef<Member | null>(null);
  if (member) lastMember.current = member;
  const m = lastMember.current;

  return (
    <Modal visible={!!member} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity activeOpacity={1} style={styles.memberModalCard}>
          <View style={styles.modalCloseRow}>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalProfile}>
            <View style={styles.modalAvatar}>
              <Text style={styles.modalAvatarEmoji}>{m?.emoji}</Text>
            </View>
            <Text style={styles.modalNickname}>{m?.nickname}</Text>
            <Text style={styles.modalRole}>{m?.role}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.modalMoodSection}>
            <Text style={styles.modalMoodTitle}>
              {m?.isMine ? "오늘 기분이 어때요?" : `${m?.nickname}의 기분`}
            </Text>
            {m?.isMine ? (
              <View style={styles.moodRow}>
                {MOODS.map((mood, i) => (
                  <TouchableOpacity key={i} onPress={() => setSelectedMood(i)} style={styles.moodItem}>
                    <View style={[styles.moodCircle, { backgroundColor: selectedMood === i ? Colors.accentLight : Colors.surface, borderColor: selectedMood === i ? Colors.accent : Colors.border, borderWidth: selectedMood === i ? 2 : 1.5 }]}>
                      <Text style={styles.moodEmoji}>{mood.icon}</Text>
                    </View>
                    <Text style={[styles.moodLabel, { color: selectedMood === i ? Colors.accent : Colors.textHint }]}>{mood.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.moodDisplay}>
                <View style={[styles.moodCircle, styles.moodCircleLarge, { backgroundColor: Colors.accentLight, borderColor: Colors.accent, borderWidth: 2 }]}>
                  <Text style={styles.moodEmojiLarge}>{MOODS[m?.currentMood ?? 0].icon}</Text>
                </View>
                <Text style={styles.moodDisplayLabel}>{MOODS[m?.currentMood ?? 0].label}</Text>
              </View>
            )}
          </View>

          {m?.isMine ? (
            <TouchableOpacity onPress={onClose} style={styles.btnSave}>
              <Text style={styles.btnSaveText}>기분 저장하기</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.btnOutline, { flex: 1 }]}>
                <Text style={styles.btnOutlineText}>편지 보내기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnFilled, { flex: 1 }]}>
                <Text style={styles.btnFilledText}>더 알아가기</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── TempModal ────────────────────────────────────────────────────────────────

function TempModal({ temperature, onClose }: { temperature: number; onClose: () => void }) {
  const fillH        = (temperature / 100) * TUBE_H;
  const tempLabelTop = Math.max(0, (1 - temperature / 100) * TUBE_H - 14);
  const allReceived  = TEMP_REWARDS.every((r) => r.received);
  const unreceived   = TEMP_REWARDS.filter((r) => !r.received);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity activeOpacity={1} style={styles.tempModalCard}>
          <View style={styles.modalCloseRow}>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={[styles.modalCloseText, { fontSize: 16 }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.thermometerRow}>
            <View style={styles.thermometerLeft}>
              <Text style={[styles.tempLabelText, { marginTop: tempLabelTop }]}>{temperature}°</Text>
            </View>
            <View style={styles.thermometerCenter}>
              <View style={styles.thermometerTube}>
                {[50, 75, 100].map((t) => (
                  <View key={t} style={[styles.tubeMarkerLine, { top: (1 - t / 100) * TUBE_H }]} />
                ))}
                <View style={[styles.tubeFill, { height: fillH }]} />
              </View>
              <View style={styles.thermometerBulb} />
            </View>
            <View style={styles.thermometerRight}>
              {unreceived.map((r) => (
                <View key={r.temp} style={[styles.rewardMarker, { position: "absolute", top: Math.max(0, (1 - r.temp / 100) * TUBE_H - 11) }]}>
                  <Text style={styles.rewardTemp}>{r.temp}°</Text>
                  <View style={styles.rewardBadge}>
                    <Text style={styles.rewardBadgeText}>💌+1  🖼️+2</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {allReceived && (
            <View style={styles.repeatReward}>
              <Text style={styles.repeatRewardTitle}>🔄 반복 지급</Text>
              <Text style={styles.repeatRewardDesc}>80도 이상 3일 유지 시 💌+1 🖼️+2 추가 지급</Text>
            </View>
          )}

          <View style={[styles.divider, { marginBottom: 14 }]} />

          <View style={styles.tempActionSection}>
            <Text style={styles.tempSectionTitle}>🔺 온도 올리기</Text>
            {TEMP_ACTIONS.map(({ label, val }) => (
              <View key={label} style={styles.tempActionRow}>
                <Text style={styles.tempActionLabel}>{label}</Text>
                <Text style={styles.tempActionVal}>{val}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.divider, { marginBottom: 14 }]} />

          <View>
            <Text style={styles.tempSectionTitle}>🔻 온도 하락</Text>
            <View style={styles.tempActionRow}>
              <Text style={styles.tempActionLabel}>24시간 전체 활동 없을 시</Text>
              <Text style={[styles.tempActionVal, { color: "#D4645A" }]}>-10°</Text>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showTempModal, setShowTempModal]   = useState(false);
  const [temperature]                        = useState(42);
  const [dots, setDots] = useState<Record<number, boolean>>(
    Object.fromEntries(MEMBERS.map((m) => [m.id, m.isMine ? false : m.hasDot]))
  );
  const tempMsg = getTempMessage(temperature);

  const handleCardPress = (member: Member) => {
    setSelectedMember({ ...member, hasDot: dots[member.id] });
  };

  const handleModalClose = () => {
    if (selectedMember) {
      setDots((prev) => ({ ...prev, [selectedMember.id]: false }));
    }
    setSelectedMember(null);
  };

  return (
    <View style={styles.root}>
      <View style={{ height: insets.top, backgroundColor: Colors.white }} />

      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.letterBadge}>
          <Text style={styles.letterBadgeIcon}>💌</Text>
          <Text style={styles.letterBadgeText}>3</Text>
        </View>
        <View style={styles.notifBtn}>
          <Text style={styles.notifIcon}>🔔</Text>
          <View style={styles.notifDot} />
        </View>
      </View>

      {/* 지붕 이미지 — 헤더 아래 고정, 스크롤 밖 */}
      <View style={styles.roofContainer}>
        <Image
          source={require("../assets/roof.png")}
          style={styles.roofImage}
          resizeMode="cover"
        />
      </View>

      {/* 가족 유형 라벨 */}
      <View style={styles.familyLabel}>
        <Text style={styles.familyLabelText}>대화가 많은 가족 🏡</Text>
      </View>

      {/* 구성원 카드 — ScrollView */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardRow}>
          {PARENTS.map((m) => (
            <MemberCard key={m.id} member={{ ...m, hasDot: dots[m.id] }} onPress={handleCardPress} />
          ))}
        </View>
        {CHILD_ROWS.map((row, i) => (
          <View key={i} style={styles.cardRow}>
            {row.map((m) => (
              <MemberCard key={m.id} member={{ ...m, hasDot: dots[m.id] }} onPress={handleCardPress} />
            ))}
          </View>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* 온도 띠 */}
      <TouchableOpacity onPress={() => setShowTempModal(true)} activeOpacity={0.9} style={styles.tempStrip}>
        <View style={styles.tempStripInner}>
          <ThermoMini percent={temperature} />
          <Text style={styles.tempValue}>{temperature}°</Text>
          <View style={styles.tempDivider} />
          <Text style={styles.tempMessage}>{tempMsg.line1}{"\n"}{tempMsg.line2}</Text>
        </View>
      </TouchableOpacity>

      <MemberModal member={selectedMember} onClose={handleModalClose} />
      {showTempModal && <TempModal temperature={temperature} onClose={() => setShowTempModal(false)} />}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  // 헤더
  header: { height: 56, paddingHorizontal: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.white },
  letterBadge: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: Colors.surface, borderRadius: 24, paddingVertical: 8, paddingHorizontal: 16 },
  letterBadgeIcon: { fontSize: 20 },
  letterBadgeText: { fontSize: 16, fontWeight: "500", color: Colors.text },
  notifBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center" },
  notifIcon: { fontSize: 22 },
  notifDot: { position: "absolute", top: 8, right: 8, width: 11, height: 11, borderRadius: 5.5, backgroundColor: Colors.accent, borderWidth: 2, borderColor: Colors.white },

  // 지붕 이미지
  roofContainer: { backgroundColor: Colors.white, overflow: "hidden" },
  roofImage: { width: "100%", height: ROOF_H },

  // 가족 유형 라벨 — 이미지와 12px 여백
  familyLabel: { marginTop: 12, paddingBottom: 14, alignItems: "center", backgroundColor: Colors.bg },
  familyLabelText: { fontSize: 20, fontWeight: "500", color: Colors.textSub },

  // 구성원 ScrollView
  scrollView: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { gap: CARD_GAP, paddingHorizontal: 24, paddingBottom: 8 },
  cardRow: { flexDirection: "row", gap: 14, justifyContent: "center" },

  // 구성원 카드
  memberCard: { width: CARD_W, height: CARD_H, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: Colors.border, borderRadius: 24, paddingVertical: 16, paddingHorizontal: 12, alignItems: "center", gap: 8 },
  memberAvatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center" },
  memberEmoji: { fontSize: 32 },
  memberDot: { position: "absolute", top: 2, right: 2, width: 13, height: 13, borderRadius: 6.5, backgroundColor: Colors.accent, borderWidth: 2, borderColor: Colors.white },
  memberNickname: { fontSize: 15, fontWeight: "500", color: Colors.text },
  memberRole: { fontSize: 12, color: Colors.textHint, textAlign: "center", lineHeight: 17 },

  // 온도 띠
  tempStrip: { height: 96, backgroundColor: Colors.bg, paddingVertical: 14, paddingHorizontal: 24 },
  tempStripInner: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.surface, borderRadius: 18, paddingVertical: 13, paddingHorizontal: 18 },
  tempValue: { fontSize: 22, fontWeight: "500", color: Colors.accent },
  tempDivider: { width: 1, height: 26, backgroundColor: "#E8C8A8" },
  tempMessage: { flex: 1, fontSize: 12, color: Colors.textSub, lineHeight: 19 },

  // ThermoMini
  thermoMini: { alignItems: "center", gap: 2 },
  thermoTube: { width: 12, height: 38, borderWidth: 1.5, borderColor: "#E8B88A", borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: "rgba(255,255,255,0.6)", overflow: "hidden", justifyContent: "flex-end" },
  thermoFill: { width: "100%", backgroundColor: Colors.accent },
  thermoBulb: { width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.accent, borderWidth: 1.5, borderColor: "#E8B88A", marginTop: -1 },

  // 모달 공통
  modalOverlay: { flex: 1, backgroundColor: "rgba(46,34,22,0.5)", alignItems: "center", justifyContent: "center" },
  modalCloseRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 4 },
  modalCloseBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center" },
  modalCloseText: { fontSize: 14, color: Colors.textSub },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 20 },

  // 구성원 모달
  memberModalCard: { width: 320, backgroundColor: Colors.white, borderRadius: 28, padding: 24, paddingTop: 28, shadowColor: "#2E2216", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 12 },
  modalProfile: { alignItems: "center", gap: 10, marginBottom: 24 },
  modalAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center" },
  modalAvatarEmoji: { fontSize: 40 },
  modalNickname: { fontSize: 17, fontWeight: "500", color: Colors.text },
  modalRole: { fontSize: 13, color: Colors.textHint },
  modalMoodSection: { marginBottom: 24 },
  modalMoodTitle: { fontSize: 12, color: Colors.textSub, marginBottom: 14, textAlign: "center" },
  moodRow: { flexDirection: "row", justifyContent: "space-around" },
  moodItem: { alignItems: "center", gap: 6 },
  moodCircle: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  moodCircleLarge: { width: 64, height: 64, borderRadius: 32 },
  moodEmoji: { fontSize: 22 },
  moodEmojiLarge: { fontSize: 30 },
  moodLabel: { fontSize: 10, textAlign: "center", lineHeight: 14 },
  moodDisplay: { alignItems: "center", gap: 8 },
  moodDisplayLabel: { fontSize: 13, color: Colors.textSub },
  btnSave: { paddingVertical: 13, borderRadius: 16, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center" },
  btnSaveText: { fontSize: 14, color: Colors.white, fontWeight: "500" },
  btnRow: { flexDirection: "row", gap: 10 },
  btnOutline: { paddingVertical: 13, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center" },
  btnOutlineText: { fontSize: 13, color: Colors.text, fontWeight: "500" },
  btnFilled: { paddingVertical: 13, borderRadius: 16, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center" },
  btnFilledText: { fontSize: 13, color: Colors.white, fontWeight: "500" },

  // 온도 모달
  tempModalCard: { width: 300, backgroundColor: Colors.white, borderRadius: 28, padding: 22, paddingTop: 24, shadowColor: "#2E2216", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 12 },
  thermometerRow: { flexDirection: "row", justifyContent: "center", alignItems: "flex-start", marginBottom: 28 },
  thermometerLeft: { width: 60, height: TUBE_H + 36, alignItems: "flex-end", paddingRight: 8 },
  tempLabelText: { fontSize: 22, fontWeight: "500", color: Colors.accent },
  thermometerCenter: { alignItems: "center" },
  thermometerTube: { width: 28, height: TUBE_H, borderWidth: 2, borderColor: "#F0D9C4", borderTopLeftRadius: 14, borderTopRightRadius: 14, backgroundColor: Colors.white, overflow: "hidden" },
  tubeMarkerLine: { position: "absolute", left: 0, right: 0, height: 1.5, backgroundColor: "rgba(180,140,110,0.5)", zIndex: 1 },
  tubeFill: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: Colors.accent },
  thermometerBulb: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accent, borderWidth: 2, borderColor: "#F0C9A0", marginTop: -1 },
  thermometerRight: { width: 110, height: TUBE_H + 36, position: "relative", paddingLeft: 10 },
  rewardMarker: { flexDirection: "row", alignItems: "center", gap: 6 },
  rewardTemp: { fontSize: 12, fontWeight: "500", color: Colors.text },
  rewardBadge: { backgroundColor: Colors.accentLight, borderWidth: 1, borderColor: Colors.accent, borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8 },
  rewardBadgeText: { fontSize: 11, fontWeight: "500", color: Colors.accent },
  repeatReward: { backgroundColor: Colors.surface, borderRadius: 14, padding: 11, paddingHorizontal: 14, marginBottom: 14 },
  repeatRewardTitle: { fontSize: 11, fontWeight: "500", color: Colors.text, marginBottom: 4 },
  repeatRewardDesc: { fontSize: 11, color: Colors.textSub, lineHeight: 18 },
  tempActionSection: { marginBottom: 14 },
  tempSectionTitle: { fontSize: 11, fontWeight: "500", color: Colors.text, marginBottom: 8 },
  tempActionRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 },
  tempActionLabel: { fontSize: 11, color: Colors.textSub },
  tempActionVal: { fontSize: 11, fontWeight: "500", color: Colors.accent },
});