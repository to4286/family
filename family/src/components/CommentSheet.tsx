import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { STORY_PHOTO_ASPECT_RATIO } from "../constants/storyPhoto";
import {
  TOAST_ANIM_MS,
  TOAST_CONTAINER_BOTTOM,
  TOAST_DISPLAY_MS,
  TOAST_SLIDE_OFFSCREEN_PX,
} from "../constants/toastUI";
import CheckCircleIcon from "./CheckCircleIcon";
import { supabase } from "../utils/supabase";

let KAView: any;
if (Platform.OS === "android") {
  try {
    KAView = require("react-native-keyboard-controller").KeyboardAvoidingView;
  } catch (e) {
    KAView = require("react-native").KeyboardAvoidingView;
  }
} else {
  KAView = require("react-native").KeyboardAvoidingView;
}

export type Comment = {
  id: number;
  writerId: number;
  memberPhotoUri?: string;
  memberNickname: string;
  text: string;
  createdAt: string;
};

type CommentSheetProps = {
  visible: boolean;
  onClose: () => void;
  comments: Comment[];
  onSubmit: (text: string) => void;
  photoUri?: string;
  myPhotoUri?: string;
  myMemberId?: number;
  onDeleteComment?: (commentId: number) => void | Promise<void>;
};

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.55;

const BOTTOM_SHEET_SLIDE_OFFSET = 300;
const BOTTOM_SHEET_OPEN_MS = 250;
const BOTTOM_SHEET_CLOSE_MS = 200;

const STORY_REPORT_REASONS = ["부적절한 댓글", "불쾌한 콘텐츠", "기타 (직접 입력)"] as const;

export default function CommentSheet({
  visible,
  onClose,
  comments,
  onSubmit,
  photoUri,
  myPhotoUri,
  myMemberId,
  onDeleteComment,
}: CommentSheetProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSelected, setReportSelected] = useState<number | null>(null);
  const [reportCustomText, setReportCustomText] = useState("");
  const [reportKeyboardVisible, setReportKeyboardVisible] = useState(false);

  const actionSlideAnim = useRef(new Animated.Value(BOTTOM_SHEET_SLIDE_OFFSET)).current;

  const [showToast, setShowToast] = useState(false);
  const [toastText, setToastText] = useState("");
  const toastAnim = useRef(new Animated.Value(TOAST_SLIDE_OFFSCREEN_PX)).current;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showReportModalRef = useRef(false);
  showReportModalRef.current = showReportModal;

  const closeActionSheetAnimated = useCallback(
    (after?: () => void) => {
      Animated.timing(actionSlideAnim, {
        toValue: BOTTOM_SHEET_SLIDE_OFFSET,
        duration: BOTTOM_SHEET_CLOSE_MS,
        useNativeDriver: true,
      }).start(() => {
        setShowActionSheet(false);
        after?.();
      });
    },
    [actionSlideAnim]
  );

  useEffect(() => {
    if (!visible) {
      setText("");
      setKeyboardVisible(false);
      setShowActionSheet(false);
      setShowReportModal(false);
      setSelectedComment(null);
      setReportSelected(null);
      setReportCustomText("");
      setReportKeyboardVisible(false);
      actionSlideAnim.setValue(BOTTOM_SHEET_SLIDE_OFFSET);
    }
  }, [visible, actionSlideAnim]);

  useEffect(() => {
    if (showActionSheet) {
      actionSlideAnim.setValue(BOTTOM_SHEET_SLIDE_OFFSET);
      Animated.timing(actionSlideAnim, {
        toValue: 0,
        duration: BOTTOM_SHEET_OPEN_MS,
        useNativeDriver: true,
      }).start();
    }
  }, [showActionSheet, actionSlideAnim]);

  useEffect(() => {
    if (!showReportModal) return;
    setReportSelected(null);
    setReportCustomText("");
  }, [showReportModal]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => {
      if (!showReportModalRef.current) setKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      if (!showReportModalRef.current) setKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!showReportModal) return;
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setReportKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setReportKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [showReportModal]);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    []
  );

  const showToastMsg = useCallback(
    (msg: string) => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      setToastText(msg);
      setShowToast(true);
      Animated.timing(toastAnim, { toValue: 0, duration: TOAST_ANIM_MS, useNativeDriver: true }).start();
      toastTimerRef.current = setTimeout(() => {
        toastTimerRef.current = null;
        Animated.timing(toastAnim, {
          toValue: TOAST_SLIDE_OFFSCREEN_PX,
          duration: TOAST_ANIM_MS,
          useNativeDriver: true,
        }).start(() => setShowToast(false));
      }, TOAST_DISPLAY_MS);
    },
    [toastAnim]
  );

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText("");
    Keyboard.dismiss();
  };

  const closeReportModal = useCallback(() => {
    setShowReportModal(false);
    setSelectedComment(null);
  }, []);

  const handleReportOverlayPress = () => {
    if (reportKeyboardVisible) {
      Keyboard.dismiss();
    } else {
      closeReportModal();
    }
  };

  const isReportEtc = reportSelected === STORY_REPORT_REASONS.length - 1;
  const canSubmitReport =
    reportSelected !== null && (!isReportEtc || reportCustomText.trim().length > 0);

  const handleSubmitReport = async () => {
    if (!canSubmitReport || !selectedComment || myMemberId == null) return;
    const reason = isReportEtc ? reportCustomText.trim() : STORY_REPORT_REASONS[reportSelected]!;
    const { error } = await supabase.from("reports").insert({
      reporter_id: myMemberId,
      target_type: "story_comment",
      target_id: selectedComment.id,
      reason,
    });
    if (error) {
      console.log("댓글 신고 실패:", error);
      return;
    }
    closeReportModal();
    showToastMsg("신고가 접수되었습니다.");
  };

  const handleDeletePress = async () => {
    const c = selectedComment;
    if (!c || !onDeleteComment) return;
    await onDeleteComment(c.id);
    closeActionSheetAnimated(() => setSelectedComment(null));
    showToastMsg("댓글이 삭제되었습니다.");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View
            style={[
              styles.overlay,
              keyboardVisible && { flex: 0, height: insets.top },
            ]}
          >
            {!keyboardVisible && photoUri && (
              <View style={styles.photoPreviewWrap}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>

        <KAView
          style={[styles.sheet, keyboardVisible ? { flex: 1 } : { height: SHEET_HEIGHT }]}
          behavior="padding"
          keyboardVerticalOffset={0}
          enabled={!showReportModal && !showActionSheet}
        >
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          <ScrollView
            style={styles.commentList}
            contentContainerStyle={styles.commentListContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {comments.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>아직 댓글이 없어요</Text>
              </View>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={styles.commentItem}>
                  {c.memberPhotoUri ? (
                    <Image source={{ uri: c.memberPhotoUri }} style={styles.commentAvatarImage} />
                  ) : (
                    <View style={[styles.commentAvatar, { alignItems: "center", justifyContent: "center" }]}>
                      <Ionicons name="person" size={20} color={Colors.textHint} />
                    </View>
                  )}
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <View style={styles.commentHeaderLeft}>
                        <Text style={styles.commentNickname}>{c.memberNickname}</Text>
                        <Text style={styles.commentTime}>{c.createdAt}</Text>
                      </View>
                      {myMemberId != null ? (
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedComment(c);
                            setShowActionSheet(true);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textHint} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <Text style={styles.commentText}>{c.text}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View
            pointerEvents={showReportModal ? "none" : "auto"}
            style={[
              styles.inputContainer,
              { paddingBottom: keyboardVisible ? 8 : insets.bottom + 12 },
            ]}
          >
            {myPhotoUri ? (
              <Image source={{ uri: myPhotoUri }} style={styles.myAvatar} />
            ) : (
              <View
                style={[styles.myAvatar, { backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center" }]}
              >
                <Ionicons name="person" size={18} color={Colors.textHint} />
              </View>
            )}
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.textInput}
                value={text}
                onChangeText={setText}
                placeholder="댓글을 입력하세요..."
                placeholderTextColor={Colors.textHint}
                maxLength={200}
                multiline
                numberOfLines={3}
                textAlignVertical="center"
                returnKeyType="default"
              />
              <TouchableOpacity
                style={styles.sendBtnWrap}
                onPress={handleSend}
                disabled={!text.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.sendBtnText}>➤</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KAView>

        <Modal visible={showActionSheet} transparent animationType="fade" onRequestClose={() => closeActionSheetAnimated(() => setSelectedComment(null))}>
          <TouchableOpacity style={styles.bottomSheetOverlay} activeOpacity={1} onPress={() => closeActionSheetAnimated(() => setSelectedComment(null))}>
            <Animated.View
              style={[
                styles.bottomSheet,
                {
                  paddingBottom: insets.bottom + 12,
                  transform: [{ translateY: actionSlideAnim }],
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.bottomSheetHandle} />
              {selectedComment != null && myMemberId != null && selectedComment.writerId === myMemberId ? (
                <TouchableOpacity style={styles.bottomSheetItem} onPress={() => void handleDeletePress()} activeOpacity={0.7}>
                  <Text style={[styles.bottomSheetItemText, styles.bottomSheetItemTextDestructive]}>삭제하기</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.bottomSheetItem}
                  onPress={() => {
                    closeActionSheetAnimated(() => setShowReportModal(true));
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.bottomSheetItemText, styles.bottomSheetItemTextDestructive]}>신고하기</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showReportModal} transparent animationType="fade" onRequestClose={handleReportOverlayPress}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleReportOverlayPress}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <View style={styles.reportModalCard} onStartShouldSetResponder={() => true}>
                <Text style={styles.reportModalTitle}>신고 사유를 선택해주세요</Text>
                <Text style={styles.reportModalDesc}>허위 신고 시 서비스 이용이 제한될 수 있어요</Text>
                <View style={styles.reasonList}>
                  {STORY_REPORT_REASONS.map((reason, i) => (
                    <View key={reason}>
                      <TouchableOpacity
                        style={[styles.reasonItem, reportSelected === i && styles.reasonItemActive]}
                        onPress={() => {
                          setReportSelected(i);
                          if (i !== STORY_REPORT_REASONS.length - 1) setReportCustomText("");
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.reasonText, reportSelected === i && styles.reasonTextActive]}>{reason}</Text>
                      </TouchableOpacity>
                      {i === STORY_REPORT_REASONS.length - 1 && isReportEtc ? (
                        <TextInput
                          style={styles.customInput}
                          value={reportCustomText}
                          onChangeText={setReportCustomText}
                          placeholder="직접 입력해주세요"
                          placeholderTextColor={Colors.textHint}
                          autoFocus
                        />
                      ) : null}
                    </View>
                  ))}
                </View>
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => {
                      closeReportModal();
                    }}
                  >
                    <Text style={styles.modalCancelBtnText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, !canSubmitReport && { backgroundColor: Colors.border }]}
                    onPress={() => void handleSubmitReport()}
                    disabled={!canSubmitReport}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.modalConfirmBtnText}>신고하기</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </Modal>

        {showToast ? (
          <Animated.View
            style={[
              styles.toastContainer,
              {
                bottom: TOAST_CONTAINER_BOTTOM + insets.bottom,
                transform: [{ translateY: toastAnim }],
              },
            ]}
          >
            <View style={{ marginRight: 0 }}>
              <CheckCircleIcon width={20} height={20} />
            </View>
            <Text style={styles.toastText}>{toastText}</Text>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  photoPreviewWrap: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  photoPreview: {
    width: "100%",
    aspectRatio: STORY_PHOTO_ASPECT_RATIO,
    borderRadius: 16,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "visible",
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  commentList: {
    flex: 1,
  },
  commentListContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.textHint,
  },
  commentItem: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  commentAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  commentNickname: {
    fontSize: 14,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
  },
  commentTime: {
    fontSize: 12,
    fontFamily: "Pretendard-Regular",
    color: Colors.textHint,
  },
  commentText: {
    fontSize: 15,
    fontFamily: "Pretendard-Regular",
    color: Colors.text,
    marginTop: 2,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
  },
  myAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 4,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingLeft: 14,
    paddingRight: 6,
    paddingTop: 4,
    paddingBottom: 7,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.text,
    maxHeight: 72,
    paddingTop: 0,
    paddingBottom: 0,
    paddingRight: 4,
    textAlignVertical: "center",
  },
  sendBtnWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnText: {
    fontSize: 15,
    color: Colors.white,
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(46,34,22,0.5)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 8,
  },
  bottomSheetItem: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  bottomSheetItemText: {
    fontSize: 16,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
  },
  bottomSheetItemTextDestructive: {
    color: "#D4645A",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(46,34,22,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  reportModalCard: {
    width: 320,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
  },
  reportModalTitle: {
    fontSize: 17,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  reportModalDesc: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.textSub,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
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
  toastContainer: {
    position: "absolute",
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
  },
  toastText: {
    fontSize: 16,
    fontFamily: "Pretendard-Medium",
    color: "#FFFFFF",
    flex: 1,
  },
});
