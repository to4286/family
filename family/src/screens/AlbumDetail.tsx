import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Svg, { Path } from "react-native-svg";
import { Colors } from "../constants/colors";

type AlbumComment = {
  id: number;
  memberPhotoUri?: string;
  memberNickname: string;
  text: string;
  createdAt: string;
};

const PHOTO_DATE = "2024-08-15";

const DUMMY_COMMENTS: AlbumComment[] = [
  { id: 1, memberPhotoUri: "https://i.pravatar.cc/150?img=47", memberNickname: "이영희", text: "우리 가족 너무 행복해 보여~", createdAt: "2일 전" },
  { id: 2, memberPhotoUri: "https://i.pravatar.cc/150?img=12", memberNickname: "김철수", text: "다음에 또 가자!", createdAt: "1일 전" },
];

const MY_PHOTO_URI = "https://i.pravatar.cc/150?img=33";

function formatPhotoDate(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}년 ${month}월 ${day}일`;
}

function ChevronLeftIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function AlbumDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [comments, setComments] = useState<AlbumComment[]>(DUMMY_COMMENTS);
  const [text, setText] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);

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
    if (!text.trim()) return;
    setComments((prev) => [...prev, {
      id: Date.now(),
      memberPhotoUri: MY_PHOTO_URI,
      memberNickname: "민준",
      text: text.trim(),
      createdAt: "방금 전",
    }]);
    setText("");
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.6}>
          <ChevronLeftIcon size={32} color={Colors.textSub} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{formatPhotoDate(PHOTO_DATE)}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.photo}>
          <View style={{ width: "100%", height: "100%", backgroundColor: "#D4B896" }} />
        </View>

        <View style={styles.commentSection}>
          <Text style={styles.commentTitle}>댓글 {comments.length}</Text>
          {comments.length === 0 ? (
            <Text style={styles.commentEmpty}>첫 댓글을 남겨보세요 😊</Text>
          ) : (
            comments.map((c) => (
              <View key={c.id} style={styles.commentRow}>
                {c.memberPhotoUri ? (
                  <Image source={{ uri: c.memberPhotoUri }} style={styles.commentAvatar} />
                ) : (
                  <View style={[styles.commentAvatar, { backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center" }]}>
                    <Text style={{ fontSize: 13, color: Colors.textSub }}>{c.memberNickname.charAt(0)}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={styles.commentMeta}>
                    <Text style={styles.commentNickname}>{c.memberNickname}</Text>
                    <Text style={styles.commentTime}>{c.createdAt}</Text>
                  </View>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.inputContainer, { paddingBottom: keyboardVisible ? 8 : insets.bottom + 12 }]}>
        <Image source={{ uri: MY_PHOTO_URI }} style={styles.myAvatar} />
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="댓글을 입력하세요..."
            placeholderTextColor={Colors.textHint}
            maxLength={200}
            multiline
            numberOfLines={3}
            textAlignVertical="center"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={!text.trim()} activeOpacity={0.7}>
            <Text style={styles.sendBtnText}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
    textAlign: "center",
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  photo: { width: "100%", height: 300 },
  commentSection: { padding: 20 },
  commentTitle: { fontSize: 15, fontFamily: "Pretendard-Medium", color: Colors.text, marginBottom: 14 },
  commentEmpty: { fontSize: 14, fontFamily: "Pretendard-Regular", color: Colors.textHint, textAlign: "center", paddingVertical: 20 },
  commentRow: { flexDirection: "row", gap: 10, marginBottom: 16, alignItems: "flex-start" },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface },
  commentMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  commentNickname: { fontSize: 14, fontFamily: "Pretendard-Medium", color: Colors.text },
  commentTime: { fontSize: 12, fontFamily: "Pretendard-Regular", color: Colors.textHint },
  commentText: { fontSize: 15, fontFamily: "Pretendard-Regular", color: Colors.text, lineHeight: 22 },
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
  myAvatar: { width: 32, height: 32, borderRadius: 16, marginBottom: 4 },
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
  input: {
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
  sendBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center" },
  sendBtnText: { fontSize: 15, color: Colors.white },
});
