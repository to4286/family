import React, { useEffect, useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/colors";

export type Comment = {
  id: number;
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
};

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.55;

export default function CommentSheet({
  visible,
  onClose,
  comments,
  onSubmit,
  photoUri,
  myPhotoUri,
}: CommentSheetProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      setText("");
      setKeyboardVisible(false);
    }
  }, [visible]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText("");
    Keyboard.dismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        {/* 상단 영역: 딤 + 사진 */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View
            style={[
              styles.overlay,
              keyboardVisible && { flex: 0, height: insets.top },
            ]}
          >
            {!keyboardVisible && photoUri && (
              <View style={styles.photoPreviewWrap}>
                <Image
                  source={{ uri: photoUri }}
                  style={styles.photoPreview}
                  resizeMode="cover"
                />
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>

        {/* 바텀시트: KeyboardAvoidingView를 sheet 내부에 배치 */}
        <KeyboardAvoidingView
          style={[
            styles.sheet,
            keyboardVisible ? { flex: 1 } : { height: SHEET_HEIGHT },
          ]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          {/* 핸들 바 */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* 댓글 목록 */}
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
                    <Image
                      source={{ uri: c.memberPhotoUri }}
                      style={styles.commentAvatarImage}
                    />
                  ) : (
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarFallback}>
                        {c.memberNickname.charAt(0)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentNickname}>{c.memberNickname}</Text>
                      <Text style={styles.commentTime}>{c.createdAt}</Text>
                    </View>
                    <Text style={styles.commentText}>{c.text}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* 입력창: 좌측 내 프사 + 인풋(내부 전송 버튼) */}
          <View
            style={[
              styles.inputContainer,
              { paddingBottom: keyboardVisible ? 8 : insets.bottom + 12 },
            ]}
          >
            {myPhotoUri ? (
              <Image source={{ uri: myPhotoUri }} style={styles.myAvatar} />
            ) : (
              <View style={[styles.myAvatar, { backgroundColor: Colors.surface }]} />
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
        </KeyboardAvoidingView>
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
    aspectRatio: 4 / 3,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarFallback: {
    fontSize: 13,
    fontFamily: "Pretendard-Medium",
    color: Colors.textSub,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentNickname: {
    fontSize: 13,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
  },
  commentTime: {
    fontSize: 11,
    fontFamily: "Pretendard-Regular",
    color: Colors.textHint,
  },
  commentText: {
    fontSize: 13,
    fontFamily: "Pretendard-Regular",
    color: Colors.text,
    marginTop: 2,
    lineHeight: 18,
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
    paddingVertical: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.text,
    maxHeight: 72,
    paddingVertical: 2,
    paddingRight: 4,
  },
  sendBtnWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnText: {
    fontSize: 18,
    color: Colors.white,
  },
});
