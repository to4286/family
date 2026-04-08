import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Polygon, Polyline, Rect } from "react-native-svg";
import { Colors } from "../constants/colors";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAPER_BG          = "#FFFDF8";
const PAPER_LINE        = "#EDD9C5";
const LINE_H            = 40;
const LINE_MX           = 24;
const MAX_CONTENT_LEN   = 500;

// ─── Types ────────────────────────────────────────────────────────────────────

type Person = { nickname: string; role: string; emoji?: string };

type Letter = {
  id: number;
  from: Person;
  to: Person;
  preview: string;
  content: string;
  date: string;
  read: boolean;
};

// ─── Static Data ──────────────────────────────────────────────────────────────

const INITIAL_LETTERS: Letter[] = [
  {
    id: 1,
    from: { nickname: "이영희", role: "따뜻한 햇살", emoji: "👩" },
    to:   { nickname: "민준",   role: "복덩이 자녀" },
    preview: "요즘 밥은 잘 먹고 있어? 엄마가 항상 걱정이 돼서...",
    content: `민준아,

요즘 밥은 잘 먹고 있어? 엄마가 항상 걱정이 돼서 이렇게 편지를 써보게 됐어.

네가 집을 떠난 지 벌써 2년이 됐는데, 엄마는 아직도 아침마다 네 방문을 열어보게 돼. 습관이 참 무섭더라고.

힘든 일이 있어도 혼자 끙끙 앓지 말고 엄마한테 얘기해줘. 네 목소리 듣는 게 엄마한테는 제일 큰 힘이 돼.

사랑해, 민준아.`,
    date: "오늘",
    read: false,
  },
  {
    id: 2,
    from: { nickname: "김철수", role: "든든한 버팀목", emoji: "👨" },
    to:   { nickname: "민준",   role: "복덩이 자녀" },
    preview: "아들, 잘 지내고 있지? 아빠가 할 말이 있어서...",
    content: `아들아,

잘 지내고 있지? 아빠가 평소에 말을 잘 못 하는 편이라 이렇게 글로 써보게 됐어.

네가 열심히 사는 모습이 아빠는 정말 자랑스러워. 말로 잘 표현 못 했는데, 항상 그렇게 생각하고 있었어.

어려운 일 있으면 아빠한테도 얘기해줘. 아빠가 항상 네 편이야.`,
    date: "어제",
    read: true,
  },
  {
    id: 3,
    from: { nickname: "하은", role: "복덩이 자녀", emoji: "👧" },
    to:   { nickname: "민준", role: "복덩이 자녀" },
    preview: "오빠~ 나 요즘 오빠 보고 싶었어. 언제 와?",
    content: `오빠~

나 요즘 오빠 보고 싶었어. 언제 집에 와?

엄마 아빠도 오빠 얘기 많이 해. 다음에 올 때 떡볶이 해줄게. 오빠 좋아하잖아.

빨리 봐!`,
    date: "3일 전",
    read: true,
  },
];

const SENDER: Person = { nickname: "민준", role: "복덩이 자녀" };

// ─── PaperLines ───────────────────────────────────────────────────────────────
// 편지지 가로 줄 (absolute 배치 View 반복)

function PaperLines({ containerH }: { containerH: number }) {
  const count = Math.ceil(containerH / LINE_H);
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.paperLine, { top: (i + 1) * LINE_H }]} />
      ))}
    </>
  );
}

// ─── Addr Block ───────────────────────────────────────────────────────────────

function AddrBlock({
  label,
  person,
  align = "left",
}: {
  label: "to." | "from.";
  person: Person;
  align?: "left" | "right";
}) {
  const isRight = align === "right";
  return (
    <View style={isRight ? styles.addrRight : undefined}>
      <Text style={styles.addrLabel}>{label}</Text>
      <Text style={styles.addrName}>{person.nickname}</Text>
      <Text style={styles.addrRole}>{person.role}</Text>
    </View>
  );
}

// ─── LetterDetailModal ────────────────────────────────────────────────────────

function LetterDetailModal({
  letter,
  onClose,
  onReply,
}: {
  letter: Letter | null;
  onClose: () => void;
  onReply: () => void;
}) {
  // lastLetter ref: 닫기 fade 중에도 데이터 유지
  const lastLetter = useRef<Letter | null>(null);
  if (letter) lastLetter.current = letter;
  const l = lastLetter.current;

  const lineCount = l
    ? Math.max(8, Math.ceil(l.content.split("\n").length * 1.5))
    : 8;
  const contentH = lineCount * LINE_H;

  return (
    <Modal
      visible={!!letter}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        onPress={onClose}
        activeOpacity={1}
      >
        {/* stopPropagation 대용: activeOpacity={1} 내부 카드 */}
        <TouchableOpacity activeOpacity={1} style={styles.detailCard}>
          {/* 닫기 버튼 */}
          <View style={styles.detailCloseRow}>
            <TouchableOpacity onPress={onClose} style={styles.detailCloseBtn}>
              <Text style={styles.detailCloseIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 편지지 스크롤 */}
          <ScrollView
            style={styles.detailScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* TO */}
            <View style={styles.detailToSection}>
              <AddrBlock label="to." person={l?.to ?? { nickname: "", role: "" }} />
            </View>

            {/* 본문 + 줄 */}
            <View style={[styles.detailBody, { minHeight: contentH }]}>
              <PaperLines containerH={contentH} />
              <Text style={styles.letterContent}>{l?.content}</Text>
            </View>

            {/* FROM */}
            <View style={styles.detailFromSection}>
              <AddrBlock
                label="from."
                person={l?.from ?? { nickname: "", role: "" }}
                align="right"
              />
            </View>
          </ScrollView>

          {/* 답장하기 */}
          <View style={styles.detailFooter}>
            <TouchableOpacity onPress={onReply} style={styles.btnReply}>
              <Text style={styles.btnReplyText}>답장하기</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── WriteScreen ──────────────────────────────────────────────────────────────
// 편지 작성 (답장) — KeyboardAvoidingView + multiline TextInput

function WriteScreen({
  receiver,
  onBack,
}: {
  receiver: Person;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [content, setContent]             = useState("");
  const [showSentModal, setShowSentModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const lineCount = Math.max(8, Math.ceil((content.split("\n").length + 2) * 1.2));
  const contentH  = lineCount * LINE_H;
  const canSend   = content.trim().length > 0;

  const handleBack = () => {
    if (canSend) setShowExitModal(true);
    else onBack();
  };

  const handleSent = () => {
    setShowSentModal(false);
    onBack();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.writeRoot, { paddingTop: insets.top }]}>
        {/* 헤더 */}
        <View style={styles.writeHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.writeBackBtn}>
            <Text style={styles.writeBackIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.writeTitle}>편지 쓰기</Text>
          <TouchableOpacity onPress={canSend ? () => setShowSentModal(true) : undefined}>
            <Text
              style={[
                styles.writeSendText,
                { color: canSend ? Colors.accent : Colors.textHint },
              ]}
            >
              보내기
            </Text>
          </TouchableOpacity>
        </View>

        {/* 편지지 스크롤 */}
        <ScrollView
          style={styles.writeScroll}
          contentContainerStyle={styles.writeScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* TO */}
          <View style={styles.writeTo}>
            <AddrBlock label="to." person={receiver} />
          </View>

          {/* 본문 편지지 + 줄 */}
          <View style={[styles.writePaper, { minHeight: contentH }]}>
            <PaperLines containerH={contentH} />
            <TextInput
              multiline
              scrollEnabled={false}
              value={content}
              onChangeText={(text) => setContent(text.slice(0, MAX_CONTENT_LEN))}
              placeholder="마음을 담아 편지를 써보세요..."
              placeholderTextColor={Colors.textHint}
              style={[styles.writeInput, { minHeight: contentH }]}
              textAlignVertical="top"
            />
            <Text style={styles.writeCounter}>
              {content.length}/{MAX_CONTENT_LEN}
            </Text>
          </View>

          {/* FROM */}
          <View style={styles.writeFrom}>
            <AddrBlock label="from." person={SENDER} align="right" />
          </View>
        </ScrollView>

        {/* 전송 완료 모달 */}
        <Modal visible={showSentModal} transparent animationType="fade">
          <TouchableOpacity style={styles.overlay} onPress={handleSent} activeOpacity={1}>
            <TouchableOpacity activeOpacity={1} style={styles.confirmCard}>
              <Text style={styles.confirmIcon}>💌</Text>
              <Text style={styles.confirmTitle}>편지가 전달됐어요</Text>
              <Text style={styles.confirmDesc}>
                {receiver.nickname}에게{"\n"}따뜻한 마음이 닿았을 거예요
              </Text>
              <TouchableOpacity onPress={handleSent} style={[styles.confirmBtn, { flex: 0, width: "100%" }]}>
                <Text style={styles.confirmBtnText}>확인</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* 나가기 확인 모달 */}
        <Modal visible={showExitModal} transparent animationType="fade">
          <TouchableOpacity
            style={styles.overlay}
            onPress={() => setShowExitModal(false)}
            activeOpacity={1}
          >
            <TouchableOpacity activeOpacity={1} style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>편지 작성을 그만할까요?</Text>
              <Text style={styles.confirmDesc}>작성 중인 내용이 사라져요</Text>
              <View style={styles.confirmBtnRow}>
                <TouchableOpacity
                  onPress={() => setShowExitModal(false)}
                  style={styles.confirmBtnOutline}
                >
                  <Text style={styles.confirmBtnOutlineText}>계속 쓰기</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onBack} style={styles.confirmBtn}>
                  <Text style={styles.confirmBtnText}>나가기</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── EnvelopeCard ─────────────────────────────────────────────────────────────

function EnvelopeCard({
  letter,
  onPress,
}: {
  letter: Letter;
  onPress: (l: Letter) => void;
}) {
  const [svgW, setSvgW] = useState(300);
  const isUnread = !letter.read;

  return (
    <TouchableOpacity
      onPress={() => onPress(letter)}
      activeOpacity={0.85}
      style={styles.envelopeWrapper}
    >
      <View
        onLayout={(e) => setSvgW(e.nativeEvent.layout.width)}
        style={[
          styles.envelopeCard,
          {
            borderColor: isUnread ? Colors.accent : Colors.border,
            shadowColor: isUnread ? Colors.accent : "#2E2216",
            shadowOpacity: isUnread ? 0.2 : 0.08,
          },
        ]}
      >
        {/* 봉투 플랩 SVG */}
        <Svg width={svgW} height={48} viewBox={`0 0 ${svgW} 48`}>
          <Rect width={svgW} height={48} fill={PAPER_BG} />
          <Polygon
            points={`0,0 ${svgW},0 ${svgW / 2},42`}
            fill={isUnread ? Colors.accentLight : PAPER_BG}
          />
          <Polyline
            points={`0,0 ${svgW / 2},42 ${svgW},0`}
            fill="none"
            stroke={isUnread ? Colors.accent : Colors.border}
            strokeWidth={1.5}
          />
        </Svg>

        {/* 봉투 본문 */}
        <View style={styles.envelopeBody}>
          <View style={styles.envelopeMeta}>
            <View style={styles.envelopeFrom}>
              <Text style={styles.envelopeFromLabel}>from.</Text>
              <View>
                <Text style={styles.envelopeFromName}>{letter.from.nickname}</Text>
                <Text style={styles.envelopeFromRole}>{letter.from.role}</Text>
              </View>
            </View>
            <View
              style={[
                styles.envelopeDateBadge,
                { borderColor: isUnread ? Colors.accent : Colors.border },
              ]}
            >
              <Text
                style={[
                  styles.envelopeDateText,
                  { color: isUnread ? Colors.accent : Colors.textHint },
                ]}
              >
                {letter.date}
              </Text>
            </View>
          </View>
          <Text style={styles.envelopePreview} numberOfLines={2}>
            {letter.preview}
          </Text>
        </View>
      </View>

      {/* 읽지 않음 dot */}
      {isUnread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

// ─── MailboxScreen ────────────────────────────────────────────────────────────

export default function MailboxScreen() {
  const insets = useSafeAreaInsets();
  const [letters, setLetters]           = useState<Letter[]>(INITIAL_LETTERS);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [replyTarget, setReplyTarget]   = useState<Person | null>(null);

  const handleOpen = (letter: Letter) => {
    setSelectedLetter(letter);
    setLetters((prev) =>
      prev.map((l) => (l.id === letter.id ? { ...l, read: true } : l))
    );
  };

  const handleReply = () => {
    if (!selectedLetter) return;
    setReplyTarget(selectedLetter.from);
    setSelectedLetter(null);
  };

  // 편지 작성(답장) 화면으로 전환
  if (replyTarget) {
    return (
      <WriteScreen receiver={replyTarget} onBack={() => setReplyTarget(null)} />
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>우체통</Text>
      </View>

      {/* 편지 목록 */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {letters.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💌</Text>
            <Text style={styles.emptyText}>아직 받은 편지가 없어요</Text>
          </View>
        ) : (
          letters.map((letter) => (
            <EnvelopeCard key={letter.id} letter={letter} onPress={handleOpen} />
          ))
        )}
      </ScrollView>

      {/* 편지 상세 모달 */}
      <LetterDetailModal
        letter={selectedLetter}
        onClose={() => setSelectedLetter(null)}
        onReply={handleReply}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Main ──
  root: { flex: 1, backgroundColor: Colors.white },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: "center",
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "500", color: Colors.text },

  // ── List ──
  list: { flex: 1, backgroundColor: Colors.white },
  listContent: { padding: 20, gap: 16, paddingBottom: 32 },
  emptyState: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 80 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 14, color: Colors.textHint },

  // ── Envelope card ──
  envelopeWrapper: { position: "relative" },
  envelopeCard: {
    backgroundColor: PAPER_BG,
    borderWidth: 1.5,
    borderRadius: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  envelopeBody: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 14 },
  envelopeMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  envelopeFrom: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  envelopeFromLabel: { fontSize: 13, color: Colors.textHint },
  envelopeFromName: { fontSize: 16, fontWeight: "500", color: Colors.text },
  envelopeFromRole: { fontSize: 13, color: Colors.textHint },
  envelopeDateBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  envelopeDateText: { fontSize: 12, fontWeight: "500" },
  envelopePreview: { fontSize: 15, color: Colors.textSub, lineHeight: 25 },
  unreadDot: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.bg,
  },

  // ── Paper lines ──
  paperLine: {
    position: "absolute",
    left: LINE_MX,
    right: LINE_MX,
    height: StyleSheet.hairlineWidth,
    backgroundColor: PAPER_LINE,
  },

  // ── Addr block ──
  addrLabel: { fontSize: 12, color: Colors.textHint, marginBottom: 4 },
  addrName:  { fontSize: 15, fontWeight: "500", color: Colors.text },
  addrRole:  { fontSize: 12, color: Colors.textSub },
  addrRight: { alignItems: "flex-end" },

  // ── Letter content (read) ──
  letterContent: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: LINE_H,
    paddingHorizontal: LINE_MX + 4,
    zIndex: 1,
  },

  // ── Detail modal ──
  overlay: {
    flex: 1,
    backgroundColor: "rgba(46,34,22,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailCard: {
    width: "90%",
    maxHeight: "80%",
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: PAPER_BG,
    shadowColor: "#2E2216",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  detailCloseRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 4,
    backgroundColor: PAPER_BG,
  },
  detailCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCloseIcon: { fontSize: 14, color: Colors.textSub },
  detailScroll: { backgroundColor: PAPER_BG },
  detailToSection: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  detailBody: { position: "relative" },
  detailFromSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: "flex-end",
  },
  detailFooter: { backgroundColor: PAPER_BG, padding: 20, paddingTop: 12 },
  btnReply: {
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  btnReplyText: { fontSize: 15, color: Colors.white, fontWeight: "500" },

  // ── Write screen ──
  writeRoot: { flex: 1, backgroundColor: Colors.bg },
  writeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 16,
    backgroundColor: Colors.bg,
  },
  writeBackBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  writeBackIcon: { fontSize: 20, color: Colors.textSub },
  writeTitle: { fontSize: 17, fontWeight: "500", color: Colors.text },
  writeSendText: { fontSize: 15, fontWeight: "500" },
  writeScroll: { flex: 1 },
  writeScrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  writeTo: {
    backgroundColor: PAPER_BG,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  writePaper: {
    backgroundColor: PAPER_BG,
    position: "relative",
  },
  writeInput: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: LINE_H,
    paddingHorizontal: LINE_MX + 4,
    paddingTop: 0,
    backgroundColor: "transparent",
    zIndex: 1,
  },
  writeCounter: {
    position: "absolute",
    bottom: 8,
    right: LINE_MX + 4,
    fontSize: 11,
    color: Colors.textHint,
    zIndex: 1,
  },
  writeFrom: {
    backgroundColor: PAPER_BG,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  // ── Confirm modals ──
  confirmCard: {
    width: 280,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    paddingTop: 28,
    alignItems: "center",
  },
  confirmIcon: { fontSize: 40, marginBottom: 12 },
  confirmTitle: {
    fontSize: 17,
    fontWeight: "500",
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  confirmDesc: {
    fontSize: 14,
    color: Colors.textSub,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: "center",
  },
  confirmBtnRow: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: "center",
  },
  confirmBtnText: { fontSize: 14, color: Colors.white, fontWeight: "500" },
  confirmBtnOutline: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  confirmBtnOutlineText: { fontSize: 14, color: Colors.text },
});
