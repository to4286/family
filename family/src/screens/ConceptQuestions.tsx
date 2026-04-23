import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  Keyboard,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";
import { Colors } from "../constants/colors";
import type { MainTabStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<MainTabStackParamList, "ConceptQuestions">;

type QuestionStatus = "active" | "answered";

type QuestionItem = {
  id: number;
  question: string;
  status: QuestionStatus;
  answer?: string;
  memo?: string;
};

const MOCK_QUESTIONS: QuestionItem[] = [
  { id: 1, question: "가장 좋아하는 계절은", status: "active" },
];

const NEXT_ACTIVE_QUESTION_TEMPLATE = {
  question: "아침에 제일 먼저 하는 일은",
} as const;

function ChevronLeftIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MemoCapsule({ text }: { text: string }) {
  return (
    <View style={styles.memoCapsule}>
      <Text style={styles.memoEmoji}>✏️</Text>
      <Text style={styles.memoText} numberOfLines={1} ellipsizeMode="tail">
        {text}
      </Text>
    </View>
  );
}

function QuestionCard({ item, onPress }: { item: QuestionItem; onPress: (item: QuestionItem) => void }) {
  const isActive = item.status === "active";
  return (
    <TouchableOpacity style={[styles.card, styles.shadow]} activeOpacity={0.88} onPress={() => onPress(item)}>
      <View style={styles.cardRow}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>{item.id}</Text>
        </View>
        <View style={styles.contentWrap}>
          <View style={styles.sentenceWrap}>
            <Text style={styles.questionText} numberOfLines={1}>
              {item.question}
            </Text>
            {isActive ? (
              <View style={styles.dashedUnderlineWrap}>
                <Text style={[styles.transparentBlankText, { opacity: 0 }]} numberOfLines={1}>
                  {"AAAAAAAAAA"}
                </Text>
                <View style={styles.svgDashContainer}>
                  <Svg width="100%" height="2">
                    <Path d="M0 1 L1000 1" stroke={Colors.textHint} strokeWidth="1.5" strokeDasharray="4 4" />
                  </Svg>
                </View>
              </View>
            ) : (
              <View style={styles.solidUnderlineWrap}>
                <Text style={styles.answerText} numberOfLines={1} ellipsizeMode="tail">
                  {item.answer}
                </Text>
              </View>
            )}
          </View>
          {!isActive && item.memo ? <MemoCapsule text={item.memo} /> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ConceptQuestionsScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const paddingTop = insets.top;
  const paddingBottom = 24 + insets.bottom;
  const { width: windowWidth } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<MainTabStackParamList>>();
  const { memberNickname, categoryName } = route.params;

  const headerTitle = `${memberNickname}의 ${categoryName}`;

  const [questions, setQuestions] = useState<QuestionItem[]>(() => MOCK_QUESTIONS.map((q) => ({ ...q })));
  const [selectedItem, setSelectedItem] = useState<QuestionItem | null>(null);
  const [draftAnswer, setDraftAnswer] = useState("");
  const [draftMemo, setDraftMemo] = useState("");
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [toastContent, setToastContent] = useState({ icon: "", text: "" });
  const toastAnim = useRef(new Animated.Value(300)).current;

  const triggerToast = useCallback(
    (icon: string, text: string) => {
      setToastContent({ icon, text });
      setShowToast(true);
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      setTimeout(() => {
        Animated.timing(toastAnim, { toValue: 300, duration: 300, useNativeDriver: true }).start(() =>
          setShowToast(false)
        );
      }, 1500);
    },
    [toastAnim]
  );

  const visibleItems = useMemo(
    () =>
      [...questions]
        .sort((a, b) => b.id - a.id)
        .filter((q) => q.status === "active" || q.status === "answered"),
    [questions],
  );

  const openModal = useCallback((item: QuestionItem) => {
    setSelectedItem(item);
    setDraftAnswer(item.answer ?? "");
    setDraftMemo(item.memo ?? "");
    setShowExitConfirm(false);
    setIsModalVisible(true);
  }, []);

  const dismissModal = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (!selectedItem) return;
    const prevAnswer = selectedItem.answer ?? "";
    const prevMemo = selectedItem.memo ?? "";
    const hasChanges = draftAnswer !== prevAnswer || draftMemo !== prevMemo;

    if (hasChanges) {
      Keyboard.dismiss();
      setTimeout(() => {
        setShowExitConfirm(true);
      }, 250);
    } else {
      Keyboard.dismiss();
      dismissModal();
    }
  }, [selectedItem, draftAnswer, draftMemo, dismissModal]);

  const handleRequestClose = useCallback(() => {
    if (showExitConfirm) {
      setShowExitConfirm(false);
      return;
    }
    handleCloseModal();
  }, [showExitConfirm, handleCloseModal]);

  const handleSave = useCallback(() => {
    if (!selectedItem) return;
    const wasActive = selectedItem.status === "active";

    setQuestions((prev) => {
      const updated = prev.map((q) =>
        q.id === selectedItem.id
          ? {
              ...q,
              answer: draftAnswer,
              memo: draftMemo.trim() || undefined,
              status: "answered" as const,
            }
          : q,
      );

      if (wasActive) {
        updated.push({
          id: Math.max(...updated.map((q) => q.id)) + 1,
          question: NEXT_ACTIVE_QUESTION_TEMPLATE.question,
          status: "active",
        });
      }
      return updated;
    });

    dismissModal();
    triggerToast("✅", "정성스런 답변을 저장했어요");
  }, [selectedItem, draftAnswer, draftMemo, dismissModal, triggerToast]);

  const hasDraftChanges =
    selectedItem != null &&
    ((selectedItem.answer ?? "") !== draftAnswer || (selectedItem.memo ?? "") !== draftMemo);

  const modalCardWidth = windowWidth * 0.85;

  return (
    <View style={[styles.root, { paddingTop }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.6}>
          <ChevronLeftIcon size={32} color={Colors.textSub} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.listContent, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {visibleItems.map((item) => (
          <QuestionCard key={item.id} item={item} onPress={openModal} />
        ))}
      </ScrollView>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleRequestClose}
      >
        <View style={styles.modalRootFill}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleRequestClose}>
            <View style={styles.modalKeyboardAvoid}>
              <View
                style={[
                  styles.modalCard,
                  styles.shadow,
                  {
                    width: modalCardWidth,
                    paddingBottom: Math.max(insets.bottom, 20),
                  },
                ]}
                onStartShouldSetResponder={() => true}
              >
                <View style={styles.modalHeaderRow}>
                  <View style={styles.modalTitleSpacer} />
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={handleRequestClose}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalCloseBtnText}>×</Text>
                  </TouchableOpacity>
                </View>
                {selectedItem ? <Text style={styles.modalTitle}>{selectedItem.question}</Text> : null}

                <Text style={styles.modalFieldLabel}>답변</Text>
                <View style={styles.modalAnswerUnderline}>
                  <TextInput
                    style={styles.modalAnswerInput}
                    value={draftAnswer}
                    onChangeText={setDraftAnswer}
                    placeholder="답변을 입력해주세요"
                    placeholderTextColor={Colors.textHint}
                    autoFocus
                  />
                </View>

                <Text style={[styles.modalFieldLabel, styles.modalMemoLabel]}>메모 (선택)</Text>
                <TextInput
                  style={styles.modalMemoInput}
                  value={draftMemo}
                  onChangeText={setDraftMemo}
                  placeholder="대화하면서 알게 된 내용을 입력하세요"
                  placeholderTextColor={Colors.textHint}
                  multiline
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.modalSaveBtn, !hasDraftChanges && styles.modalSaveBtnDisabled]}
                  onPress={handleSave}
                  disabled={!hasDraftChanges}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalSaveBtnText}>저장</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>

          {showExitConfirm ? (
            <View style={[StyleSheet.absoluteFillObject, styles.exitLayerRoot]} pointerEvents="box-none">
              <TouchableWithoutFeedback onPress={() => setShowExitConfirm(false)}>
                <View style={[StyleSheet.absoluteFillObject, styles.exitLayerDim]} />
              </TouchableWithoutFeedback>
              <View style={styles.exitLayerCenter} pointerEvents="box-none">
                <View style={[styles.exitCard, styles.shadow, { width: modalCardWidth, paddingBottom: Math.max(insets.bottom, 22) }]}>
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
                    <TouchableOpacity style={[styles.exitBtn, styles.exitBtnPrimary]} onPress={dismissModal} activeOpacity={0.85}>
                      <Text style={styles.exitBtnPrimaryText}>그만하기</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      {showToast && (
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnim }] }]}>
          <Text style={styles.toastIcon}>{toastContent.icon}</Text>
          <Text style={styles.toastText}>{toastContent.text}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  shadow: {
    shadowColor: "#8B6914",
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
    elevation: 3,
  },
  scroll: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "NanumSquareRound-Bold",
    color: Colors.text,
    textAlign: "center",
  },
  listContent: {
    gap: 16,
    padding: 24,
    paddingTop: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  numberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  contentWrap: {
    flex: 1,
    marginLeft: 10,
  },
  sentenceWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "nowrap",
  },
  numberText: {
    fontSize: 12,
    fontFamily: "Pretendard-SemiBold",
    color: Colors.accent,
  },
  questionText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: "NanumSquareRound-Bold",
    lineHeight: 24,
    flexShrink: 0,
  },
  dashedUnderlineWrap: {
    flex: 1,
    marginLeft: 6,
    position: "relative",
  },
  transparentBlankText: {
    fontSize: 16,
    fontFamily: "Pretendard-Regular",
    lineHeight: 24,
  },
  svgDashContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -2,
    height: 2,
    overflow: "hidden",
  },
  solidUnderlineWrap: {
    flex: 1,
    marginLeft: 6,
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
    borderStyle: "solid",
  },
  answerText: {
    fontSize: 16,
    fontFamily: "NanumSquareRound-ExtraBold",
    color: Colors.accent,
    lineHeight: 24,
    textAlign: "center",
  },
  memoCapsule: {
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  memoEmoji: {
    fontSize: 12,
    lineHeight: 18,
  },
  memoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Pretendard-Regular",
    color: Colors.textSub,
    lineHeight: 18,
  },
  modalRootFill: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(46,34,22,0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 180,
  },
  modalKeyboardAvoid: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    overflow: "visible",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitleSpacer: {
    flex: 1,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseBtnText: {
    fontSize: 18,
    lineHeight: 20,
    color: Colors.textSub,
    fontFamily: "Pretendard-Regular",
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "NanumSquareRound-Bold",
    color: Colors.text,
    marginBottom: 18,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontFamily: "Pretendard-Regular",
    color: Colors.textSub,
    marginBottom: 8,
  },
  modalAnswerUnderline: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
    borderStyle: "solid",
    marginBottom: 16,
  },
  modalAnswerInput: {
    fontSize: 16,
    fontFamily: "NanumSquareRound-ExtraBold",
    color: Colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  modalMemoLabel: {
    marginTop: 0,
  },
  modalMemoInput: {
    backgroundColor: Colors.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: Colors.surface,
    height: 100,
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.text,
    marginBottom: 20,
  },
  modalSaveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
  },
  modalSaveBtnDisabled: {
    opacity: 0.5,
  },
  modalSaveBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: "NanumSquareRound-Bold",
  },
  exitLayerRoot: {
    zIndex: 50,
  },
  exitLayerDim: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  exitLayerCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  exitCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 22,
    overflow: "visible",
  },
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
  exitBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  exitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  exitBtnSecondary: {
    backgroundColor: Colors.surface,
  },
  exitBtnSecondaryText: {
    fontSize: 15,
    fontFamily: "NanumSquareRound-Bold",
    color: Colors.text,
  },
  exitBtnPrimary: {
    backgroundColor: Colors.accent,
  },
  exitBtnPrimaryText: {
    fontSize: 15,
    fontFamily: "NanumSquareRound-Bold",
    color: Colors.white,
  },
  toastContainer: {
    position: "absolute",
    bottom: 100, // 하단 탭바가 없는 화면이므로 살짝 아래로 조정
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: "rgba(46, 34, 22, 0.85)",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 14,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  toastIcon: {
    fontSize: 20,
  },
  toastText: {
    fontSize: 16,
    fontFamily: "Pretendard-Medium",
    color: "#FFFFFF",
  },
});