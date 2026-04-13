import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";
import type { MainTabParamList, MainTabStackParamList } from "../navigation/types";
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  ScrollView,
  StyleSheet,
  Modal,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/colors";

const sceneBg  = require("../assets/scenebg.png");
const houseImg = require("../assets/house.png");

// ─── Types ────────────────────────────────────────────────────────────────────

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Home">,
  NativeStackNavigationProp<MainTabStackParamList>
>;

type Member = {
  id: number;
  emoji: string;
  nickname: string;
  role: string;
  hasDot: boolean;
  isMine: boolean;
  isParent: boolean;
  currentMood: number;
  message?: string;
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
  { id: 1, emoji: "👨", nickname: "김철수", role: "든든한 버팀목", hasDot: true,  isMine: false, isParent: true,  currentMood: 1, message: "오늘 퇴근 늦을 것 같아" },
  { id: 2, emoji: "👩", nickname: "이영희", role: "따뜻한 햇살",   hasDot: false, isMine: false, isParent: true,  currentMood: 0, message: "" },
  { id: 3, emoji: "🧒", nickname: "민준",   role: "복덩이 자녀",  hasDot: true,  isMine: true,  isParent: false, currentMood: 2, message: "" },
  { id: 4, emoji: "👦", nickname: "지수",   role: "복덩이 자녀",  hasDot: false, isMine: false, isParent: false, currentMood: 2, message: "주말에 뭐해?" },
  { id: 5, emoji: "👧", nickname: "하은",   role: "복덩이 자녀",  hasDot: true,  isMine: false, isParent: false, currentMood: 3, message: "" },
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
const SCENE_H  = Dimensions.get("window").height;
const HOUSE_W  = Math.round(SCREEN_W * 1.0);
const HOUSE_H  = Math.round(HOUSE_W * 0.72);

const CARD_H   = 150;
const CARD_W   = 160;
const CARD_GAP = 16;
const TUBE_H   = 200;

const ME             = MEMBERS.filter((m) => m.isMine);
const MOMS           = MEMBERS.filter((m) => m.isParent && m.emoji === "👩");
const DADS           = MEMBERS.filter((m) => m.isParent && m.emoji === "👨");
const CHILDREN       = MEMBERS.filter((m) => !m.isMine && !m.isParent);
const SORTED_MEMBERS = [...ME, ...MOMS, ...DADS, ...CHILDREN];
const ALL_ROWS       = chunkArray(SORTED_MEMBERS, 2);

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
      <View style={{ width: "100%", alignItems: "center", position: "relative", height: 100 }}>
        <View style={[styles.memberAvatar, { position: "absolute", bottom: 8, zIndex: 1 }]}>
          <Text style={styles.memberEmoji}>{member.emoji}</Text>
          {member.hasDot && <View style={styles.memberDot} />}
        </View>
        <View style={styles.bubbleWrapper}>
          <View style={styles.bubbleBody}>
            {member.message ? (
              <Text style={styles.bubbleText} numberOfLines={1}>
                {member.message.length > 12
                  ? member.message.slice(0, 12) + "..."
                  : member.message}
              </Text>
            ) : (
              <Text style={[styles.bubbleText, { color: Colors.textSub }]} numberOfLines={1}>
                {member.isMine ? "내 상황을 공유해봐요" : "무엇을 하고 있을까요?"}
              </Text>
            )}
          </View>
          <View style={styles.bubbleTailOuter} />
          <View style={styles.bubbleTailInner} />
        </View>
      </View>
      <Text style={styles.memberNickname}>{member.nickname}</Text>
    </TouchableOpacity>
  );
}

// ─── MemberModal ──────────────────────────────────────────────────────────────

function MemberModal({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const [selectedMood, setSelectedMood] = useState(2);
  const [message, setMessage] = useState("");
  // fade-out 애니메이션 중 member가 null이 되어도 마지막 데이터 유지
  const lastMember = useRef<Member | null>(null);
  if (member) lastMember.current = member;
  const m = lastMember.current;

  return (
    <Modal visible={!!member} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
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

          {!m?.isMine && !!m?.message && (
            <View style={styles.modalMessageBubble}>
              <Text style={styles.modalMessageBubbleText}>{`💬 ${m.message}`}</Text>
            </View>
          )}

          <View style={styles.modalMoodSection}>
            {m?.isMine ? (
              <>
                <Text style={styles.modalMoodTitle}>오늘 기분이 어때요?</Text>
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
                <View style={{ height: 24 }} />
                <Text style={styles.modalMessageTitle}>무슨 생각을 하고 있나요?</Text>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="말풍선에 표시돼요"
                  maxLength={30}
                  style={styles.modalMessageInput}
                />
                <Text style={styles.modalMessageHint}>24시간 후 자동으로 사라져요</Text>
              </>
            ) : (
              <>
                <Text style={styles.modalMoodTitle}>{m?.nickname}의 기분</Text>
                <View style={styles.moodDisplay}>
                  <View style={[styles.moodCircle, styles.moodCircleLarge, { backgroundColor: Colors.accentLight, borderColor: Colors.accent, borderWidth: 2 }]}>
                    <Text style={styles.moodEmojiLarge}>{MOODS[m?.currentMood ?? 0].icon}</Text>
                  </View>
                  <Text style={styles.moodDisplayLabel}>{MOODS[m?.currentMood ?? 0].label}</Text>
                </View>
              </>
            )}
          </View>

          {m?.isMine ? (
            <TouchableOpacity onPress={onClose} style={styles.btnSave}>
              <Text style={styles.btnSaveText}>저장하기</Text>
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
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
  const navigation = useNavigation<HomeScreenNavigationProp>();
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
      {/* 전체 배경 이미지 */}
      <Image
        source={sceneBg}
        style={styles.fullBg}
        resizeMode="cover"
      />

      {/* 헤더 (배경 위 absolute) */}
      <View style={[styles.header, { top: insets.top }]}>
        <View style={styles.letterBadge}>
          <Text style={styles.letterBadgeIcon}>💌</Text>
          <Text style={styles.letterBadgeText}>3장</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => navigation.navigate("Notifications")}
          activeOpacity={0.85}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M8.35206 20.242C8.78721 20.7922 9.34171 21.2364 9.97367 21.541C10.6056 21.8455 11.2985 22.0025 12.0001 22C12.7016 22.0025 13.3945 21.8455 14.0264 21.541C14.6584 21.2364 15.2129 20.7922 15.6481 20.242C13.2271 20.5697 10.773 20.5697 8.35206 20.242ZM18.7501 9V9.704C18.7501 10.549 18.9901 11.375 19.4421 12.078L20.5501 13.801C21.5611 15.375 20.7891 17.514 19.0301 18.011C14.4338 19.3127 9.56635 19.3127 4.97006 18.011C3.21106 17.514 2.43906 15.375 3.45006 13.801L4.55806 12.078C5.01127 11.3692 5.25178 10.5453 5.25106 9.704V9C5.25106 5.134 8.27306 2 12.0001 2C15.7271 2 18.7501 5.134 18.7501 9Z"
              fill={Colors.accent}
            />
          </Svg>
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      {/* 집 이미지 (배경 위 absolute, 언덕에 걸쳐서) */}
      <Image
        source={houseImg}
        style={styles.houseImage}
        resizeMode="contain"
      />

      {/* 반투명 카드 패널 */}
      <View style={styles.contentPanel}>
        {/* 가족 유형 텍스트 */}
        <View style={styles.familyLabel}>
          <Text style={styles.familyLabelText}>대화가 많은 가족 🏡</Text>
        </View>

        {/* 구성원 카드 ScrollView */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {ALL_ROWS.map((row, i) => (
            <View key={i} style={styles.cardRow}>
              {row.map((m) => (
                <MemberCard key={m.id} member={{ ...m, hasDot: dots[m.id] }} onPress={handleCardPress} />
              ))}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 온도 띠 */}
      <TouchableOpacity
        onPress={() => setShowTempModal(true)}
        activeOpacity={0.9}
        style={styles.tempStrip}
      >
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
  root: {
    flex: 1,
    backgroundColor: "#F9C47A",
  },

  fullBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },

  // 헤더 (배경 위 absolute)
  header: {
    position: "absolute",
    left: 0, right: 0,
    zIndex: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
  },
  houseImage: {
    position: "absolute",
    width: HOUSE_W,
    height: HOUSE_H,
    left: (SCREEN_W - HOUSE_W) / 2,
    top: SCENE_H * 0.12,
    zIndex: 2,
  },

  // 반투명 카드 패널
  contentPanel: {
    position: "absolute",
    bottom: 96,
    left: 24,
    right: 24,
    backgroundColor: "rgba(255,252,248,0.92)",
    borderRadius: 24,
    paddingTop: 16,
    paddingBottom: 8,
    height: SCENE_H * 0.40,
    zIndex: 5,
  },

  letterBadge: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(255,255,255,0.82)", borderRadius: 24, paddingVertical: 8, paddingHorizontal: 16 },
  letterBadgeIcon: { fontSize: 18, fontFamily: "Pretendard-Regular" },
  letterBadgeText: { fontSize: 15, fontFamily: "Pretendard-Medium", color: Colors.accent },
  notifBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.82)", alignItems: "center", justifyContent: "center" },
  notifIcon: { fontSize: 22, fontFamily: "Pretendard-Regular" },
  notifDot: { position: "absolute", top: 8, right: 8, width: 11, height: 11, borderRadius: 5.5, backgroundColor: Colors.accent, borderWidth: 2, borderColor: Colors.white },

  // 가족 유형 라벨
  familyLabel: { alignItems: "center", paddingBottom: 12 },
  familyLabelText: { fontSize: 17, fontFamily: "Pretendard-Medium", color: Colors.textSub },

  // 구성원 ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: CARD_GAP,
    paddingHorizontal: 12,
    paddingBottom: CARD_H * 0.35,
  },
  cardRow: { flexDirection: "row", gap: 14, justifyContent: "center" },

  // 구성원 카드
  memberCard: { width: CARD_W, height: CARD_H, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: Colors.border, borderRadius: 24, paddingVertical: 16, paddingHorizontal: 12, alignItems: "center", gap: 4 },
  memberAvatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center" },
  memberEmoji: { fontSize: 32, fontFamily: "Pretendard-Regular" },
  memberDot: { position: "absolute", top: 2, right: 2, width: 13, height: 13, borderRadius: 6.5, backgroundColor: Colors.accent, borderWidth: 2, borderColor: Colors.white },
  memberNickname: { fontSize: 15, fontFamily: "Pretendard-Medium", color: Colors.text },
  bubbleWrapper: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, alignItems: "center" },
  bubbleBody: { backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 14, borderWidth: 1.2, borderColor: Colors.border, paddingVertical: 5, paddingHorizontal: 10, maxWidth: 130 },
  bubbleText: { fontSize: 12, fontFamily: "Pretendard-Regular", color: Colors.text, lineHeight: 16 },
  bubbleTailOuter: { width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: Colors.border, alignSelf: "flex-start", marginLeft: 44 },
  bubbleTailInner: { width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 6, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "rgba(255,255,255,0.95)", alignSelf: "flex-start", marginLeft: 45, marginTop: -8 },

  // 온도 띠
  tempStrip: {
    position: "absolute",
    bottom: 8,
    left: 24,
    right: 24,
    height: 80,
    paddingBottom: 4,
    paddingTop: 0,
    backgroundColor: "transparent",
    zIndex: 5,
  },
  tempStripInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,252,248,0.92)",
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  tempValue: { fontSize: 22, fontFamily: "Pretendard-Medium", color: Colors.accent },
  tempDivider: { width: 1, height: 26, backgroundColor: "#E8C8A8" },
  tempMessage: { flex: 1, fontSize: 12, fontFamily: "Pretendard-Regular", color: Colors.textSub, lineHeight: 19 },

  // ThermoMini
  thermoMini: { alignItems: "center", gap: 2 },
  thermoTube: { width: 12, height: 38, borderWidth: 1.5, borderColor: "#E8B88A", borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: "rgba(255,255,255,0.6)", overflow: "hidden", justifyContent: "flex-end" },
  thermoFill: { width: "100%", backgroundColor: Colors.accent },
  thermoBulb: { width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.accent, borderWidth: 1.5, borderColor: "#E8B88A", marginTop: -1 },

  // 모달 공통
  modalOverlay: { flex: 1, backgroundColor: "rgba(46,34,22,0.5)", alignItems: "center", justifyContent: "center" },
  modalCloseRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 4 },
  modalCloseBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center" },
  modalCloseText: { fontSize: 14, fontFamily: "Pretendard-Regular", color: Colors.textSub },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 20 },

  // 구성원 모달
  memberModalCard: { width: 320, backgroundColor: Colors.white, borderRadius: 28, padding: 24, paddingTop: 28, shadowColor: "#2E2216", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 12 },
  modalProfile: { alignItems: "center", gap: 10, marginBottom: 24 },
  modalAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center" },
  modalAvatarEmoji: { fontSize: 40, fontFamily: "Pretendard-Regular" },
  modalNickname: { fontSize: 17, fontFamily: "Pretendard-Medium", color: Colors.text },
  modalRole: { fontSize: 13, fontFamily: "Pretendard-Regular", color: Colors.textHint },
  modalMoodSection: { marginBottom: 24 },
  modalMoodTitle: { fontSize: 13, fontFamily: "Pretendard-Regular", color: Colors.textSub, marginBottom: 14, textAlign: "left" },
  moodRow: { flexDirection: "row", justifyContent: "space-around" },
  moodItem: { alignItems: "center", gap: 6 },
  moodCircle: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  moodCircleLarge: { width: 64, height: 64, borderRadius: 32 },
  moodEmoji: { fontSize: 22, fontFamily: "Pretendard-Regular" },
  moodEmojiLarge: { fontSize: 30, fontFamily: "Pretendard-Regular" },
  moodLabel: { fontSize: 10, fontFamily: "Pretendard-Regular", textAlign: "center", lineHeight: 14 },
  moodDisplay: { alignItems: "center", gap: 8 },
  moodDisplayLabel: { fontSize: 13, fontFamily: "Pretendard-Regular", color: Colors.textSub },
  modalMessageBubble: { backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 20 },
  modalMessageBubbleText: { fontSize: 13, fontFamily: "Pretendard-Regular", color: Colors.text },
  modalMessageTitle: { fontSize: 13, fontFamily: "Pretendard-Regular", color: Colors.textSub, marginBottom: 8 },
  modalMessageInput: { backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, fontSize: 14, color: Colors.text },
  modalMessageHint: { fontSize: 11, fontFamily: "Pretendard-Regular", color: Colors.textHint, marginTop: 6 },
  btnSave: { paddingVertical: 13, borderRadius: 16, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center" },
  btnSaveText: { fontSize: 14, fontFamily: "Pretendard-Medium", color: Colors.white },
  btnRow: { flexDirection: "row", gap: 10 },
  btnOutline: { paddingVertical: 13, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center" },
  btnOutlineText: { fontSize: 13, fontFamily: "Pretendard-Medium", color: Colors.text },
  btnFilled: { paddingVertical: 13, borderRadius: 16, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center" },
  btnFilledText: { fontSize: 13, fontFamily: "Pretendard-Medium", color: Colors.white },

  // 온도 모달
  tempModalCard: { width: 300, backgroundColor: Colors.white, borderRadius: 28, padding: 22, paddingTop: 24, shadowColor: "#2E2216", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 12 },
  thermometerRow: { flexDirection: "row", justifyContent: "center", alignItems: "flex-start", marginBottom: 28 },
  thermometerLeft: { width: 60, height: TUBE_H + 36, alignItems: "flex-end", paddingRight: 8 },
  tempLabelText: { fontSize: 22, fontFamily: "Pretendard-Medium", color: Colors.accent },
  thermometerCenter: { alignItems: "center" },
  thermometerTube: { width: 28, height: TUBE_H, borderWidth: 2, borderColor: "#F0D9C4", borderTopLeftRadius: 14, borderTopRightRadius: 14, backgroundColor: Colors.white, overflow: "hidden" },
  tubeMarkerLine: { position: "absolute", left: 0, right: 0, height: 1.5, backgroundColor: "rgba(180,140,110,0.5)", zIndex: 1 },
  tubeFill: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: Colors.accent },
  thermometerBulb: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accent, borderWidth: 2, borderColor: "#F0C9A0", marginTop: -1 },
  thermometerRight: { width: 110, height: TUBE_H + 36, position: "relative", paddingLeft: 10 },
  rewardMarker: { flexDirection: "row", alignItems: "center", gap: 6 },
  rewardTemp: { fontSize: 12, fontFamily: "Pretendard-Medium", color: Colors.text },
  rewardBadge: { backgroundColor: Colors.accentLight, borderWidth: 1, borderColor: Colors.accent, borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8 },
  rewardBadgeText: { fontSize: 11, fontFamily: "Pretendard-Medium", color: Colors.accent },
  repeatReward: { backgroundColor: Colors.surface, borderRadius: 14, padding: 11, paddingHorizontal: 14, marginBottom: 14 },
  repeatRewardTitle: { fontSize: 11, fontFamily: "Pretendard-Medium", color: Colors.text, marginBottom: 4 },
  repeatRewardDesc: { fontSize: 11, fontFamily: "Pretendard-Regular", color: Colors.textSub, lineHeight: 18 },
  tempActionSection: { marginBottom: 14 },
  tempSectionTitle: { fontSize: 11, fontFamily: "Pretendard-Medium", color: Colors.text, marginBottom: 8 },
  tempActionRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 },
  tempActionLabel: { fontSize: 11, fontFamily: "Pretendard-Regular", color: Colors.textSub },
  tempActionVal: { fontSize: 11, fontFamily: "Pretendard-Medium", color: Colors.accent },
});