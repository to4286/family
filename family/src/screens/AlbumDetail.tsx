import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
  Animated,
  Dimensions,
  Alert,
  SafeAreaView,
  PanResponder,
} from "react-native";
import Constants from "expo-constants";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import CheckCircleIcon from "../components/CheckCircleIcon";
import Svg, { Path } from "react-native-svg";
import { Colors } from "../constants/colors";
import type { MainTabStackParamList } from "../navigation/types";
import { supabase } from "../utils/supabase";

let ImageZoom: any = null;
const isExpoGo = Constants.appOwnership === "expo";
if (!isExpoGo) {
  try {
    ImageZoom = require("@likashefqet/react-native-image-zoom").ImageZoom;
  } catch (e) {
    ImageZoom = null;
  }
}

let useAnimatedReaction: any = null;
let useSharedValue: any = null;
let runOnJS: any = null;

const isExpoGoAlbum = Constants.appOwnership === "expo";
if (!isExpoGoAlbum) {
  try {
    const reanimated = require("react-native-reanimated");
    useAnimatedReaction = reanimated.useAnimatedReaction;
    useSharedValue = reanimated.useSharedValue;
    runOnJS = reanimated.runOnJS;
  } catch (e) {}
}
if (!useSharedValue) {
  useSharedValue = (initial: number) => ({ value: initial });
}
if (!useAnimatedReaction) {
  useAnimatedReaction = () => {};
}
if (!runOnJS) {
  runOnJS = (fn: (...args: unknown[]) => unknown) => fn;
}

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

type Props = NativeStackScreenProps<MainTabStackParamList, "AlbumDetail">;

type AlbumComment = {
  id: number;
  writerId: number;
  memberPhotoUri?: string;
  memberNickname: string;
  text: string;
  createdAt: string;
};

type MyMemberProfile = {
  id: number;
  nickname: string | null;
  profile_image_url: string | null;
};

const PHOTO_REPORT_REASONS = ["부적절한 댓글", "불쾌한 콘텐츠", "기타 (직접 입력)"] as const;

const PHOTO_REPORT_REASONS_LIST = ["부적절한 사진", "불쾌한 콘텐츠", "기타 (직접 입력)"];

const BOTTOM_SHEET_SLIDE_OFFSET = 300;
const BOTTOM_SHEET_OPEN_MS = 250;
const BOTTOM_SHEET_CLOSE_MS = 200;

const { height: WINDOW_HEIGHT } = Dimensions.get("window");

function remoteImageCache(uri: string): { cachePolicy: "memory-disk" } | undefined {
  return uri.startsWith("http") ? { cachePolicy: "memory-disk" } : undefined;
}

function ChevronLeftIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function AlbumDetailScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainTabStackParamList>>();
  const { photoId, folderId, folderName, folderCount, folderMaxCount, folderCoverColor, imageUri, uploadedAt } =
    route.params;

  const [comments, setComments] = useState<AlbumComment[]>([]);
  const [text, setText] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const panY = useRef(new Animated.Value(0)).current;

  const [showToast, setShowToast] = useState(false);
  const [toastContent, setToastContent] = useState({ icon: "", text: "" });
  const toastAnim = useRef(new Animated.Value(300)).current;
  const slideAnim = useRef(new Animated.Value(BOTTOM_SHEET_SLIDE_OFFSET)).current;
  const commentActionSlideAnim = useRef(new Animated.Value(BOTTOM_SHEET_SLIDE_OFFSET)).current;

  const [myProfile, setMyProfile] = useState<MyMemberProfile | null>(null);
  const [uploaderId, setUploaderId] = useState<number | null>(null);

  const [selectedComment, setSelectedComment] = useState<AlbumComment | null>(null);
  const [showCommentActionSheet, setShowCommentActionSheet] = useState(false);
  const [showCommentReportModal, setShowCommentReportModal] = useState(false);
  const [reportSelected, setReportSelected] = useState<number | null>(null);
  const [reportCustomText, setReportCustomText] = useState("");
  const [reportKeyboardVisible, setReportKeyboardVisible] = useState(false);

  const [showPhotoReportModal, setShowPhotoReportModal] = useState(false);
  const [photoReportSelected, setPhotoReportSelected] = useState<number | null>(null);
  const [photoReportCustomText, setPhotoReportCustomText] = useState("");
  const [photoReportKeyboardVisible, setPhotoReportKeyboardVisible] = useState(false);

  const albumZoomScale = useRef(1);
  const albumZoomScaleShared = useSharedValue(1);
  const albumImageZoomRef = useRef<any>(null);

  useAnimatedReaction(
    () => albumZoomScaleShared.value,
    (scale: number) => {
      runOnJS((s: number) => {
        albumZoomScale.current = s;
      })(scale);
    }
  );

  const showCommentReportModalRef = useRef(false);
  const showPhotoReportModalRef = useRef(false);
  useEffect(() => {
    showCommentReportModalRef.current = showCommentReportModal;
  }, [showCommentReportModal]);
  useEffect(() => {
    showPhotoReportModalRef.current = showPhotoReportModal;
  }, [showPhotoReportModal]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data } = await supabase
          .from("members")
          .select("id, nickname, profile_image_url")
          .eq("auth_uid", user.id)
          .maybeSingle();
        if (!cancelled && data) setMyProfile(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("photos")
        .select("uploader_id")
        .eq("id", Number(photoId))
        .single();
      if (data) setUploaderId(data.uploader_id);
    })();
  }, [photoId]);

  const fetchComments = useCallback(async () => {
    try {
      const { data: rows, error } = await supabase
        .from("comments")
        .select("id, writer_id, content, created_at")
        .eq("target_type", "PHOTO")
        .eq("target_id", Number(photoId))
        .order("created_at", { ascending: true });

      if (error) throw error;

      const list = rows ?? [];

      const { data: { user } } = await supabase.auth.getUser();
      let blockedSet = new Set<number>();
      if (user) {
        const { data: me } = await supabase
          .from("members")
          .select("id")
          .eq("auth_uid", user.id)
          .single();
        if (me) {
          const { data: blockedRows } = await supabase
            .from("blocked_users")
            .select("blocked_id")
            .eq("blocker_id", me.id);
          blockedSet = new Set((blockedRows ?? []).map((r: { blocked_id: number }) => r.blocked_id));
        }
      }

      const filteredList = list.filter((r: any) => !blockedSet.has(r.writer_id));
      if (filteredList.length === 0) {
        setComments([]);
        return;
      }

      const writerIds = [...new Set(filteredList.map((r) => r.writer_id))];
      const { data: writers } = await supabase
        .from("members")
        .select("id, nickname, profile_image_url")
        .in("id", writerIds);

      const wmap = new Map((writers ?? []).map((w) => [w.id, w]));

      const mapped: AlbumComment[] = filteredList.map((r) => {
        const w = wmap.get(r.writer_id);
        const d = new Date(r.created_at);

        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / (1000 * 60));
        const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffWeek = Math.floor(diffDay / 7);

        let formattedDate = "";
        if (diffMs < 0) formattedDate = "방금 전";
        else if (diffMin < 1) formattedDate = "방금 전";
        else if (diffHour < 1) formattedDate = `${diffMin}분 전`;
        else if (diffDay < 1) formattedDate = `${diffHour}시간 전`;
        else if (diffDay < 7) formattedDate = `${diffDay}일 전`;
        else if (diffDay < 30) formattedDate = `${diffWeek}주 전`;
        else formattedDate = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;

        return {
          id: r.id,
          writerId: r.writer_id,
          memberNickname: w?.nickname || "가족",
          memberPhotoUri: w?.profile_image_url || undefined,
          text: r.content,
          createdAt: formattedDate,
        };
      });

      setComments(mapped);
    } catch (e) {
      console.log("댓글 로드 실패:", e);
    }
  }, [photoId]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

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

  const closeBottomSheet = useCallback(
    (onClosed?: () => void) => {
      Animated.timing(slideAnim, {
        toValue: BOTTOM_SHEET_SLIDE_OFFSET,
        duration: BOTTOM_SHEET_CLOSE_MS,
        useNativeDriver: true,
      }).start(() => {
        setShowMenu(false);
        onClosed?.();
      });
    },
    [slideAnim]
  );

  const closeCommentActionSheet = useCallback(
    (after?: () => void) => {
      Animated.timing(commentActionSlideAnim, {
        toValue: BOTTOM_SHEET_SLIDE_OFFSET,
        duration: BOTTOM_SHEET_CLOSE_MS,
        useNativeDriver: true,
      }).start(() => {
        setShowCommentActionSheet(false);
        after?.();
      });
    },
    [commentActionSlideAnim]
  );

  const closeCommentReportModal = useCallback(() => {
    setShowCommentReportModal(false);
    setSelectedComment(null);
  }, []);

  const handleCommentReportOverlayPress = useCallback(() => {
    if (reportKeyboardVisible) {
      Keyboard.dismiss();
    } else {
      closeCommentReportModal();
    }
  }, [reportKeyboardVisible, closeCommentReportModal]);

  const isPhotoReportEtc = reportSelected === PHOTO_REPORT_REASONS.length - 1;
  const canSubmitPhotoReport =
    reportSelected !== null && (!isPhotoReportEtc || reportCustomText.trim().length > 0);

  const handleSubmitPhotoCommentReport = useCallback(async () => {
    if (!canSubmitPhotoReport || !selectedComment || !myProfile) return;
    const reason = isPhotoReportEtc ? reportCustomText.trim() : PHOTO_REPORT_REASONS[reportSelected]!;
    const { error } = await supabase.from("reports").insert({
      reporter_id: myProfile.id,
      target_type: "photo_comment",
      target_id: selectedComment.id,
      reason,
    });
    if (error) {
      console.log("댓글 신고 실패:", error);
      return;
    }
    closeCommentReportModal();
    triggerToast("✅", "신고가 접수되었습니다.");
  }, [
    canSubmitPhotoReport,
    selectedComment,
    myProfile,
    isPhotoReportEtc,
    reportSelected,
    reportCustomText,
    triggerToast,
    closeCommentReportModal,
  ]);

  const handleAlbumCommentDelete = useCallback(async () => {
    const c = selectedComment;
    if (!c) return;
    await supabase.from("comments").delete().eq("id", c.id);
    closeCommentActionSheet(() => setSelectedComment(null));
    void fetchComments();
    triggerToast("✅", "댓글이 삭제되었습니다.");
  }, [selectedComment, closeCommentActionSheet, fetchComments, triggerToast]);

  const closePhotoReportModal = useCallback(() => {
    setShowPhotoReportModal(false);
  }, []);

  const handlePhotoReportOverlayPress = useCallback(() => {
    if (photoReportKeyboardVisible) {
      Keyboard.dismiss();
    } else {
      closePhotoReportModal();
    }
  }, [photoReportKeyboardVisible, closePhotoReportModal]);

  const isAlbumPhotoReportEtc = photoReportSelected === PHOTO_REPORT_REASONS_LIST.length - 1;
  const canSubmitAlbumPhotoReport =
    photoReportSelected !== null && (!isAlbumPhotoReportEtc || photoReportCustomText.trim().length > 0);

  const handleSubmitAlbumPhotoReport = useCallback(async () => {
    if (!canSubmitAlbumPhotoReport || !myProfile) return;
    const reason = isAlbumPhotoReportEtc
      ? photoReportCustomText.trim()
      : PHOTO_REPORT_REASONS_LIST[photoReportSelected]!;
    const { error } = await supabase.from("reports").insert({
      reporter_id: myProfile.id,
      target_type: "photo",
      target_id: Number(photoId),
      reason,
    });
    if (error) {
      console.log("사진 신고 실패:", error);
      return;
    }
    closePhotoReportModal();
    triggerToast("✅", "신고가 접수되었습니다.");
  }, [
    canSubmitAlbumPhotoReport,
    myProfile,
    isAlbumPhotoReportEtc,
    photoReportSelected,
    photoReportCustomText,
    photoId,
    triggerToast,
    closePhotoReportModal,
  ]);

  useEffect(() => {
    if (showMenu) {
      slideAnim.setValue(BOTTOM_SHEET_SLIDE_OFFSET);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: BOTTOM_SHEET_OPEN_MS,
        useNativeDriver: true,
      }).start();
    }
  }, [showMenu, slideAnim]);

  useEffect(() => {
    if (showCommentActionSheet) {
      commentActionSlideAnim.setValue(BOTTOM_SHEET_SLIDE_OFFSET);
      Animated.timing(commentActionSlideAnim, {
        toValue: 0,
        duration: BOTTOM_SHEET_OPEN_MS,
        useNativeDriver: true,
      }).start();
    }
  }, [showCommentActionSheet, commentActionSlideAnim]);

  useEffect(() => {
    if (!showCommentReportModal) return;
    setReportSelected(null);
    setReportCustomText("");
  }, [showCommentReportModal]);

  useEffect(() => {
    if (!showCommentReportModal) return;
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
  }, [showCommentReportModal]);

  useEffect(() => {
    if (!showPhotoReportModal) return;
    setPhotoReportSelected(null);
    setPhotoReportCustomText("");
  }, [showPhotoReportModal]);

  useEffect(() => {
    if (!showPhotoReportModal) return;
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setPhotoReportKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setPhotoReportKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [showPhotoReportModal]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => {
      if (!showCommentReportModalRef.current && !showPhotoReportModalRef.current) setKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      if (!showCommentReportModalRef.current && !showPhotoReportModalRef.current) setKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const closeFullscreen = useCallback(() => {
    albumZoomScale.current = 1;
    albumZoomScaleShared.value = 1;
    albumImageZoomRef.current?.reset();
    setShowFullscreen(false);
  }, [albumZoomScaleShared]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (albumZoomScale.current > 1) return false;
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (albumZoomScale.current > 1) return;
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (albumZoomScale.current > 1) {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          return;
        }
        if (gestureState.dy > 150 || gestureState.vy > 1.5) {
          Animated.timing(panY, {
            toValue: WINDOW_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            closeFullscreen();
          });
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const backgroundOpacity = panY.interpolate({
    inputRange: [0, WINDOW_HEIGHT / 2],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const openFullscreen = useCallback(() => {
    panY.setValue(0);
    albumZoomScale.current = 1;
    albumZoomScaleShared.value = 1;
    setShowFullscreen(true);
  }, [panY, albumZoomScaleShared]);

  const handleCommentSubmit = async () => {
    if (!text.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: me } = await supabase
        .from("members")
        .select("id")
        .eq("auth_uid", user.id)
        .single();

      if (!me) return;

      const { error } = await supabase.from("comments").insert({
        target_type: "PHOTO",
        target_id: Number(photoId),
        writer_id: me.id,
        content: text.trim(),
      });

      if (error) throw error;

      setText("");
      Keyboard.dismiss();
      void fetchComments();
    } catch (e) {
      console.log("댓글 등록 실패:", e);
    }
  };

  const handleSaveToGallery = useCallback(async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("권한 필요", "갤러리에 저장하려면 사진 접근 권한이 필요해요.");
        return;
      }
      if (imageUri) {
        // 원격 URL이면 로컬에 먼저 다운로드
        let localUri = imageUri;
        if (imageUri.startsWith("http")) {
          const fileName = imageUri.split("/").pop() || `photo_${Date.now()}.jpg`;
          const downloadResult = await FileSystem.downloadAsync(
            imageUri,
            FileSystem.cacheDirectory + fileName
          );
          localUri = downloadResult.uri;
        }
        await MediaLibrary.saveToLibraryAsync(localUri);
      }
      closeBottomSheet(() => {
        triggerToast("✅", "사진을 저장했습니다");
      });
    } catch {
      Alert.alert("오류", "사진을 저장하지 못했어요. 다시 시도해 주세요.");
    }
  }, [closeBottomSheet, triggerToast, imageUri]);

  const handleOpenDeleteFromMenu = useCallback(() => {
    closeBottomSheet(() => setShowDeleteConfirm(true));
  }, [closeBottomSheet]);

  const handleDelete = async () => {
    try {
      const url = imageUri;
      const bucketPath = "albums/";
      if (url) {
        const idx = url.indexOf(bucketPath);
        if (idx !== -1) {
          const filePath = url.substring(idx + bucketPath.length);
          await supabase.storage.from("albums").remove([filePath]);
        }
      }

      const { error } = await supabase.from("photos").delete().eq("id", Number(photoId));

      if (error) throw error;

      setShowDeleteConfirm(false);

      route.params?.onDeleteSuccess?.();
      navigation.pop();
    } catch (e) {
      console.log("사진 삭제 실패:", e);
    }
  };

  return (
    <View style={styles.outerRoot}>
      <KAView
        style={[styles.root, { paddingTop: insets.top }]}
        behavior="padding"
        keyboardVerticalOffset={0}
        enabled={!showCommentReportModal && !showCommentActionSheet}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.6}>
            <ChevronLeftIcon size={32} color={Colors.textSub} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{uploadedAt ?? ""}</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowMenu(true)}
            activeOpacity={0.65}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#5C4D3D" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.photo} activeOpacity={0.95} onPress={openFullscreen}>
            {imageUri ? (
              <ExpoImage
                source={{ uri: imageUri }}
                style={styles.photoImage}
                contentFit="cover"
                {...remoteImageCache(imageUri)}
              />
            ) : null}
          </TouchableOpacity>

          <View style={styles.commentSection}>
            <Text style={styles.commentTitle}>댓글 {comments.length}</Text>
            {comments.length === 0 ? (
              <Text style={styles.commentEmpty}>첫 댓글을 남겨보세요 😊</Text>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={styles.commentRow}>
                  {c.memberPhotoUri ? (
                    <ExpoImage
                      source={{ uri: c.memberPhotoUri }}
                      style={styles.commentAvatar}
                      contentFit="cover"
                      {...remoteImageCache(c.memberPhotoUri)}
                    />
                  ) : (
                    <View
                      style={[
                        styles.commentAvatar,
                        { backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center" },
                      ]}
                    >
                      <Ionicons name="person" size={20} color={Colors.textHint} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={styles.commentMetaRow}>
                      <View style={styles.commentMetaLeft}>
                        <Text style={styles.commentNickname}>{c.memberNickname}</Text>
                        <Text style={styles.commentTime}>{c.createdAt}</Text>
                      </View>
                      {myProfile != null ? (
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedComment(c);
                            setShowCommentActionSheet(true);
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
          </View>
        </ScrollView>

        <View
          pointerEvents={showCommentReportModal || showPhotoReportModal ? "none" : "auto"}
          style={[styles.inputContainer, { paddingBottom: keyboardVisible ? 8 : insets.bottom + 12 }]}
        >
            {myProfile?.profile_image_url ? (
              <ExpoImage
                source={{ uri: myProfile.profile_image_url }}
                style={styles.myAvatar}
                contentFit="cover"
                {...remoteImageCache(myProfile.profile_image_url)}
              />
            ) : (
              <View
                style={[
                  styles.myAvatar,
                  { backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center" },
                ]}
              >
                <Ionicons name="person" size={18} color={Colors.textHint} />
              </View>
            )}
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
              <TouchableOpacity style={styles.sendBtn} onPress={handleCommentSubmit} disabled={!text.trim()} activeOpacity={0.7}>
                <Text style={styles.sendBtnText}>➤</Text>
              </TouchableOpacity>
            </View>
          </View>
      </KAView>

      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => closeBottomSheet()}>
        <TouchableOpacity style={styles.bottomSheetOverlay} activeOpacity={1} onPress={() => closeBottomSheet()}>
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                paddingBottom: insets.bottom + 12,
                transform: [{ translateY: slideAnim }],
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.bottomSheetHandle} />
            <TouchableOpacity style={styles.bottomSheetItem} onPress={handleSaveToGallery} activeOpacity={0.7}>
              <Text style={styles.bottomSheetItemText}>저장하기</Text>
            </TouchableOpacity>
            <View style={styles.bottomSheetDivider} />
            {uploaderId != null && myProfile?.id != null && uploaderId === myProfile.id ? (
              <TouchableOpacity style={styles.bottomSheetItem} onPress={handleOpenDeleteFromMenu} activeOpacity={0.7}>
                <Text style={[styles.bottomSheetItemText, styles.bottomSheetItemTextDestructive]}>삭제하기</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.bottomSheetItem}
                onPress={() => {
                  closeBottomSheet();
                  setTimeout(() => setShowPhotoReportModal(true), 300);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.bottomSheetItemText, styles.bottomSheetItemTextDestructive]}>신고하기</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDeleteConfirm(false)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>사진을 삭제할까요?</Text>
            <Text style={styles.modalDesc}>
              앨범에서 사진이 삭제되며{"\n"}복구할 수 없어요
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={styles.modalCancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreateBtn, { flex: 1, backgroundColor: "#D4645A" }]}
                onPress={handleDelete}
                activeOpacity={0.85}
              >
                <Text style={styles.modalCreateBtnText}>삭제하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showFullscreen} transparent animationType="fade" onRequestClose={closeFullscreen}>
        <Animated.View style={[styles.modalSafeContainer, { backgroundColor: "black", opacity: backgroundOpacity }]}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.modalCloseButton} onPress={closeFullscreen} activeOpacity={0.85}>
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>
            <Animated.View
              {...panResponder.panHandlers}
              style={[styles.fullScreenPhotoContainer, { transform: [{ translateY: panY }] }]}
            >
              {imageUri ? (
                ImageZoom ? (
                  <ImageZoom
                    ref={albumImageZoomRef}
                    key={imageUri}
                    uri={imageUri}
                    scale={albumZoomScaleShared}
                    minScale={1}
                    maxScale={5}
                    doubleTapScale={3}
                    isDoubleTapEnabled
                    isPanEnabled
                    isPinchEnabled
                    style={styles.fullScreenPhoto}
                    resizeMode="contain"
                    {...({
                      onScaleChanged: (scale: number) => {
                        albumZoomScale.current = scale;
                      },
                    } as any)}
                  />
                ) : (
                  <ExpoImage
                    source={{ uri: imageUri }}
                    style={styles.fullScreenPhoto}
                    contentFit="contain"
                    {...remoteImageCache(imageUri)}
                  />
                )
              ) : null}
            </Animated.View>
          </SafeAreaView>
        </Animated.View>
      </Modal>

      <Modal
        visible={showCommentActionSheet}
        transparent
        animationType="fade"
        onRequestClose={() => closeCommentActionSheet(() => setSelectedComment(null))}
      >
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => closeCommentActionSheet(() => setSelectedComment(null))}
        >
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                paddingBottom: insets.bottom + 12,
                transform: [{ translateY: commentActionSlideAnim }],
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.bottomSheetHandle} />
            {selectedComment != null && myProfile != null && selectedComment.writerId === myProfile.id ? (
              <TouchableOpacity style={styles.bottomSheetItem} onPress={() => void handleAlbumCommentDelete()} activeOpacity={0.7}>
                <Text style={[styles.bottomSheetItemText, styles.bottomSheetItemTextDestructive]}>삭제하기</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.bottomSheetItem}
                onPress={() => {
                  closeCommentActionSheet(() => setShowCommentReportModal(true));
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.bottomSheetItemText, styles.bottomSheetItemTextDestructive]}>신고하기</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showCommentReportModal} transparent animationType="fade" onRequestClose={handleCommentReportOverlayPress}>
        <TouchableOpacity style={styles.reportModalOverlay} activeOpacity={1} onPress={handleCommentReportOverlayPress}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.reportReasonCard} onStartShouldSetResponder={() => true}>
              <Text style={styles.reportModalTitle}>신고 사유를 선택해주세요</Text>
              <Text style={styles.reportModalDesc}>허위 신고 시 서비스 이용이 제한될 수 있어요</Text>
              <View style={styles.reasonList}>
                {PHOTO_REPORT_REASONS.map((reason, i) => (
                  <View key={reason}>
                    <TouchableOpacity
                      style={[styles.reasonItem, reportSelected === i && styles.reasonItemActive]}
                      onPress={() => {
                        setReportSelected(i);
                        if (i !== PHOTO_REPORT_REASONS.length - 1) setReportCustomText("");
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.reasonText, reportSelected === i && styles.reasonTextActive]}>{reason}</Text>
                    </TouchableOpacity>
                    {i === PHOTO_REPORT_REASONS.length - 1 && isPhotoReportEtc ? (
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
              <View style={styles.reportModalBtnRow}>
                <TouchableOpacity
                  style={styles.reportModalCancelBtn}
                  onPress={() => {
                    closeCommentReportModal();
                  }}
                >
                  <Text style={styles.reportModalCancelBtnText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.reportModalConfirmBtn,
                    !canSubmitPhotoReport && { backgroundColor: Colors.border },
                  ]}
                  onPress={() => void handleSubmitPhotoCommentReport()}
                  disabled={!canSubmitPhotoReport}
                  activeOpacity={0.85}
                >
                  <Text style={styles.reportModalConfirmBtnText}>신고하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showPhotoReportModal} transparent animationType="fade" onRequestClose={handlePhotoReportOverlayPress}>
        <TouchableOpacity style={styles.reportModalOverlay} activeOpacity={1} onPress={handlePhotoReportOverlayPress}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.reportReasonCard} onStartShouldSetResponder={() => true}>
              <Text style={styles.reportModalTitle}>신고 사유를 선택해주세요</Text>
              <Text style={styles.reportModalDesc}>허위 신고 시 서비스 이용이 제한될 수 있어요</Text>
              <View style={styles.reasonList}>
                {PHOTO_REPORT_REASONS_LIST.map((reason, i) => (
                  <View key={`${reason}-${i}`}>
                    <TouchableOpacity
                      style={[styles.reasonItem, photoReportSelected === i && styles.reasonItemActive]}
                      onPress={() => {
                        setPhotoReportSelected(i);
                        if (i !== PHOTO_REPORT_REASONS_LIST.length - 1) setPhotoReportCustomText("");
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.reasonText, photoReportSelected === i && styles.reasonTextActive]}>{reason}</Text>
                    </TouchableOpacity>
                    {i === PHOTO_REPORT_REASONS_LIST.length - 1 && isAlbumPhotoReportEtc ? (
                      <TextInput
                        style={styles.customInput}
                        value={photoReportCustomText}
                        onChangeText={setPhotoReportCustomText}
                        placeholder="직접 입력해주세요"
                        placeholderTextColor={Colors.textHint}
                        autoFocus
                      />
                    ) : null}
                  </View>
                ))}
              </View>
              <View style={styles.reportModalBtnRow}>
                <TouchableOpacity style={styles.reportModalCancelBtn} onPress={closePhotoReportModal} activeOpacity={0.85}>
                  <Text style={styles.reportModalCancelBtnText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.reportModalConfirmBtn,
                    !canSubmitAlbumPhotoReport && { backgroundColor: Colors.border },
                  ]}
                  onPress={() => void handleSubmitAlbumPhotoReport()}
                  disabled={!canSubmitAlbumPhotoReport}
                  activeOpacity={0.85}
                >
                  <Text style={styles.reportModalConfirmBtnText}>신고하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {showToast && (
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnim }] }]}>
          {toastContent.icon === "✅" ? (
            <View style={{ marginRight: 0 }}>
              <CheckCircleIcon width={20} height={20} />
            </View>
          ) : (
            <Text style={styles.toastIcon}>{toastContent.icon}</Text>
          )}
          <Text style={styles.toastText}>{toastContent.text}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerRoot: { flex: 1, backgroundColor: Colors.white },
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
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -8,
  },
  photo: { width: "100%", height: 300, backgroundColor: "#2a2a2a" },
  photoImage: { width: "100%", height: "100%" },
  commentSection: { padding: 20 },
  commentTitle: { fontSize: 15, fontFamily: "Pretendard-Medium", color: Colors.text, marginBottom: 14 },
  commentEmpty: { fontSize: 14, fontFamily: "Pretendard-Regular", color: Colors.textHint, textAlign: "center", paddingVertical: 20 },
  commentRow: { flexDirection: "row", gap: 10, marginBottom: 16, alignItems: "flex-start" },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface },
  commentMetaRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  commentMetaLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
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
  bottomSheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginHorizontal: 24,
  },
  reportModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(46,34,22,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  reportReasonCard: {
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
  reportModalBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  reportModalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  reportModalCancelBtnText: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.text,
  },
  reportModalConfirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: "center",
  },
  reportModalConfirmBtnText: {
    fontSize: 14,
    fontFamily: "Pretendard-Medium",
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(46,34,22,0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 120,
  },
  modalCard: {
    width: 300,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    paddingTop: 28,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 20,
  },
  modalDesc: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.textSub,
    textAlign: "center",
    lineHeight: 22,
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
    justifyContent: "center",
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.text,
  },
  modalCreateBtn: {
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCreateBtnText: {
    fontSize: 15,
    fontFamily: "Pretendard-Medium",
    color: Colors.white,
  },
  modalSafeContainer: {
    flex: 1,
  },
  modalHeader: {
    height: 50,
    paddingHorizontal: 15,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    marginTop: Platform.OS === "android" ? 50 : 0,
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenPhotoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenPhoto: {
    width: "100%",
    height: "100%",
  },
  toastContainer: {
    position: "absolute",
    bottom: 130,
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
