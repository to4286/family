import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";

import { Colors } from "../constants/colors";
import {
  TOAST_ANIM_MS,
  TOAST_CONTAINER_BOTTOM,
  TOAST_DISPLAY_MS,
  TOAST_SLIDE_OFFSCREEN_PX,
} from "../constants/toastUI";
import type { MainTabStackParamList } from "../navigation/types";
import { supabase } from "../utils/supabase";
import CheckCircleIcon from "../components/CheckCircleIcon";

const BLOCK_BRAND_RED = "#E85A5A";

function remoteImageCache(uri: string): { cachePolicy: "memory-disk" } | undefined {
  return uri.startsWith("http") ? { cachePolicy: "memory-disk" } : undefined;
}

type MemberRow = {
  id: number;
  nickname: string;
  profile_image_url: string | null;
  isBlocked: boolean;
};

type ConfirmModalState =
  | null
  | {
      mode: "block" | "unblock";
      member: MemberRow;
    };

function ChevronLeftIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DefaultAvatar() {
  return (
    <View style={styles.avatarPlaceholder}>
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
          fill={Colors.textHint}
        />
      </Svg>
    </View>
  );
}

function BlockActionButton({ isBlocked, onPress }: { isBlocked: boolean; onPress: () => void }) {
  if (isBlocked) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={styles.btnUnblock}
      >
        <Text style={styles.btnUnblockText}>차단 해제</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.btnBlock}>
      <Text style={styles.btnBlockText}>차단하기</Text>
    </TouchableOpacity>
  );
}

type ConfirmModalProps = {
  visible: boolean;
  state: ConfirmModalState;
  onClose: () => void;
  onConfirmBlock: () => void;
  onConfirmUnblock: () => void;
};

function ConfirmModal({ visible, state, onClose, onConfirmBlock, onConfirmUnblock }: ConfirmModalProps) {
  if (!state) return null;

  const nickname = state.member.nickname || "가족";
  const isBlock = state.mode === "block";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.confirmLayerRoot} pointerEvents="box-none">
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[StyleSheet.absoluteFillObject, styles.confirmDim]} />
        </TouchableWithoutFeedback>
        <View style={styles.confirmCenter} pointerEvents="box-none">
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>
              {isBlock
                ? "정말 차단하시겠습니까?"
                : `${nickname}님을 차단 해제하시겠습니까?`}
            </Text>
            {isBlock ? (
              <Text style={styles.confirmSubtitle}>
                {`${nickname}님의 모든 활동을 알 수 없게 됩니다.\n한 번 더 대화를 해보는 건 어떨까요?`}
              </Text>
            ) : null}
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity style={styles.confirmBtnClose} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.confirmBtnCloseText}>닫기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtnDanger}
                onPress={isBlock ? onConfirmBlock : onConfirmUnblock}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmBtnDangerText}>{isBlock ? "차단하기" : "차단 해제"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function MemberManagementScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainTabStackParamList>>();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ConfirmModalState>(null);

  const [showToast, setShowToast] = useState(false);
  const [toastText, setToastText] = useState("");
  const toastAnim = useRef(new Animated.Value(TOAST_SLIDE_OFFSCREEN_PX)).current;
  const toastHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (toastHideTimerRef.current) clearTimeout(toastHideTimerRef.current);
    },
    []
  );

  const showToastMessage = useCallback(
    (text: string) => {
      if (toastHideTimerRef.current) {
        clearTimeout(toastHideTimerRef.current);
        toastHideTimerRef.current = null;
      }
      setToastText(text);
      setShowToast(true);
      Animated.timing(toastAnim, { toValue: 0, duration: TOAST_ANIM_MS, useNativeDriver: true }).start();
      toastHideTimerRef.current = setTimeout(() => {
        toastHideTimerRef.current = null;
        Animated.timing(toastAnim, {
          toValue: TOAST_SLIDE_OFFSCREEN_PX,
          duration: TOAST_ANIM_MS,
          useNativeDriver: true,
        }).start(() => setShowToast(false));
      }, TOAST_DISPLAY_MS);
    },
    [toastAnim]
  );

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMembers([]);
        return;
      }

      const { data: me, error: meErr } = await supabase
        .from("members")
        .select("id, family_id")
        .eq("auth_uid", user.id)
        .single();

      if (meErr || !me) {
        setMembers([]);
        return;
      }

      const [{ data: others, error: othersErr }, { data: blockedRows, error: blockedErr }] = await Promise.all([
        supabase
          .from("members")
          .select("id, nickname, profile_image_url")
          .eq("family_id", me.family_id)
          .neq("id", me.id),
        supabase.from("blocked_users").select("blocked_id").eq("blocker_id", me.id),
      ]);

      if (othersErr) {
        console.log("구성원 조회 실패:", othersErr);
        Alert.alert("오류", "가족 구성원을 불러오지 못했습니다.");
        setMembers([]);
        return;
      }

      if (blockedErr) {
        console.log("차단 목록 조회 실패:", blockedErr);
      }

      const blockedSet = new Set((blockedRows ?? []).map((r: { blocked_id: number }) => r.blocked_id));

      setMembers(
        (others ?? []).map((m: { id: number; nickname: string | null; profile_image_url: string | null }) => ({
          id: m.id,
          nickname: m.nickname || "가족",
          profile_image_url: m.profile_image_url,
          isBlocked: blockedSet.has(m.id),
        }))
      );
    } catch (e) {
      console.log("구성원 관리 로딩 실패:", e);
      Alert.alert("오류", "데이터를 불러오지 못했습니다.");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [loadMembers])
  );

  const patchMemberBlocked = useCallback((memberId: number, isBlocked: boolean) => {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, isBlocked } : m)));
  }, []);

  const handleConfirmBlock = async () => {
    if (!modal || modal.mode !== "block") return;
    const target = modal.member;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: me } = await supabase.from("members").select("id").eq("auth_uid", user.id).single();
    if (!me) return;

    const { error } = await supabase.from("blocked_users").insert({
      blocker_id: me.id,
      blocked_id: target.id,
    });

    if (error) {
      console.log("차단 실패:", error);
      Alert.alert("오류", "차단에 실패했습니다. 다시 시도해주세요.");
      return;
    }

    patchMemberBlocked(target.id, true);
    setModal(null);
    showToastMessage(`${target.nickname}님을 차단했습니다.`);
  };

  const handleConfirmUnblock = async () => {
    if (!modal || modal.mode !== "unblock") return;
    const target = modal.member;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: me } = await supabase.from("members").select("id").eq("auth_uid", user.id).single();
    if (!me) return;

    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", me.id)
      .eq("blocked_id", target.id);

    if (error) {
      console.log("차단 해제 실패:", error);
      Alert.alert("오류", "차단 해제에 실패했습니다. 다시 시도해주세요.");
      return;
    }

    patchMemberBlocked(target.id, false);
    setModal(null);
    showToastMessage(`${target.nickname}님을 차단 해제했습니다.`);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.6}>
          <ChevronLeftIcon size={32} color={Colors.textSub} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>구성원 관리</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: 24 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.profile_image_url ? (
                <Image
                  source={{ uri: item.profile_image_url }}
                  style={styles.avatar}
                  contentFit="cover"
                  {...remoteImageCache(item.profile_image_url)}
                />
              ) : (
                <DefaultAvatar />
              )}
              <Text style={styles.nickname} numberOfLines={1}>
                {item.nickname}
              </Text>
              <BlockActionButton
                isBlocked={item.isBlocked}
                onPress={() =>
                  setModal({ mode: item.isBlocked ? "unblock" : "block", member: item })
                }
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>표시할 다른 가족 구성원이 없습니다.</Text>
            </View>
          }
        />
      )}

      <ConfirmModal
        visible={modal !== null}
        state={modal}
        onClose={() => setModal(null)}
        onConfirmBlock={handleConfirmBlock}
        onConfirmUnblock={handleConfirmUnblock}
      />

      {showToast && (
        <Animated.View
          style={[
            styles.toastContainer,
            { bottom: TOAST_CONTAINER_BOTTOM + insets.bottom, transform: [{ translateY: toastAnim }] },
          ]}
        >
          <View style={{ marginRight: 0 }}>
            <CheckCircleIcon width={20} height={20} />
          </View>
          <Text style={styles.toastText}>{toastText}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  topBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  topBarTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
    textAlign: "center",
  },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 24, paddingTop: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  nickname: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
    marginRight: 8,
  },
  btnBlock: {
    backgroundColor: BLOCK_BRAND_RED,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnBlockText: {
    fontSize: 14,
    fontFamily: "Pretendard-Medium",
    color: Colors.white,
  },
  btnUnblock: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BLOCK_BRAND_RED,
  },
  btnUnblockText: {
    fontSize: 14,
    fontFamily: "Pretendard-Medium",
    color: BLOCK_BRAND_RED,
  },
  emptyBox: { paddingVertical: 48, alignItems: "center" },
  emptyText: { fontSize: 14, fontFamily: "Pretendard-Regular", color: Colors.textSub, textAlign: "center" },
  confirmLayerRoot: { flex: 1 },
  confirmDim: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
  confirmCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  confirmCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  confirmTitle: {
    fontSize: 18,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
    textAlign: "center",
  },
  confirmSubtitle: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.textSub,
    textAlign: "center",
    marginTop: 14,
  },
  confirmBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 28,
  },
  confirmBtnClose: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnCloseText: {
    fontSize: 15,
    fontFamily: "Pretendard-Regular",
    color: Colors.text,
  },
  confirmBtnDanger: {
    flex: 1,
    backgroundColor: BLOCK_BRAND_RED,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDangerText: {
    fontSize: 15,
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
  toastText: { fontSize: 16, fontFamily: "Pretendard-Medium", color: "#FFFFFF", flex: 1 },
});
