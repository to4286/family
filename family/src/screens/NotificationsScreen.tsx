import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";

import { Colors } from "../constants/colors";
import type { MainTabStackParamList } from "../navigation/types";
import { supabase } from "../utils/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifTypeKey = keyof typeof NOTIF_TYPES;

export type NotificationItem = {
  id: number;
  type: NotifTypeKey;
  nickname: string | null;
  message: string;
  subMessage: string | null;
  time: string;
  read: boolean;
  emoji: string | null;
  /** 댓글 썸네일 자리 표시 색상 (추후 photoSource + Image로 교체) */
  photoColor: string | null;
  memberId: number | null;
  photoId: number | null;
  folderId: number | null;
  folderName: string | null;
  folderCoverColor: string | null;
};

type NavigationProp = NativeStackNavigationProp<MainTabStackParamList>;

// ─── 알림 유형 정의 ───────────────────────────────────────────────────────────

const NOTIF_TYPES = {
  mood: { icon: "🌞", iconType: "system", label: "기분 변경" },
  comment: { icon: "💬", iconType: "profile", label: "앨범 댓글" },
  album: { icon: "🖼️", iconType: "system", label: "사진 등록" },
  member: { icon: "👋", iconType: "system", label: "구성원 참여" },
  notice: { icon: "📢", iconType: "system", label: "공지사항" },
  story: { icon: "📷", iconType: "system", label: "새 스토리" },
  poke: { icon: "👈", iconType: "system", label: "콕 찌르기" },
  story_comment: { icon: "💬", iconType: "profile", label: "스토리 댓글" },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

function ChevronLeftIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── NotifIcon ────────────────────────────────────────────────────────────────

function NotifIcon({ notif }: { notif: NotificationItem }) {
  const typeDef = NOTIF_TYPES[notif.type];

  if (typeDef.iconType === "profile" && notif.emoji) {
    return (
      <View style={styles.notifIconProfile}>
        <Text style={styles.notifIconProfileEmoji}>{notif.emoji}</Text>
      </View>
    );
  }

  return (
    <View style={styles.notifIconSystem}>
      <Text style={styles.notifIconSystemEmoji}>{typeDef.icon}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: myMember } = await supabase
        .from("members")
        .select("id")
        .eq("auth_uid", user.id)
        .single();

      if (!myMember) return;

      const { data: rows, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("receiver_id", myMember.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.log("알림 조회 실패:", error);
        return;
      }

      if (!rows || rows.length === 0) {
        if (isMountedRef.current) setNotifications([]);
        return;
      }

      const senderIds = [...new Set(rows.map((r) => r.sender_id).filter(Boolean))];
      let senderMap = new Map<number, { nickname: string; profile_image_url: string | null }>();

      if (senderIds.length > 0) {
        const { data: senders } = await supabase
          .from("members")
          .select("id, nickname, profile_image_url")
          .in("id", senderIds);

        if (senders) {
          senderMap = new Map(senders.map((s) => [s.id, s]));
        }
      }

      const mapped: NotificationItem[] = rows.map((r) => {
        const sender = r.sender_id ? senderMap.get(r.sender_id) : null;
        const notifType = (r.notif_type || "notice") as NotifTypeKey;

        return {
          id: r.id,
          type: notifType,
          nickname: sender?.nickname || null,
          message: r.message,
          subMessage: r.sub_message || null,
          time: formatRelativeTime(r.created_at),
          read: r.is_read ?? false,
          emoji: null,
          photoColor: null,
          memberId: r.sender_id || null,
          photoId: r.photo_id || null,
          folderId: r.album_id || null,
          folderName: null,
          folderCoverColor: null,
        };
      });

      if (isMountedRef.current) {
        setNotifications(mapped);
      }
    } catch (e) {
      console.log("알림 로딩 실패:", e);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const markAllAsRead = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: myMember } = await supabase
          .from("members")
          .select("id")
          .eq("auth_uid", user.id)
          .single();

        if (!myMember) return;

        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("receiver_id", myMember.id)
          .eq("is_read", false);
      } catch (e) {
        console.log("전체 읽음 처리 실패:", e);
      }
    };

    if (notifications.length > 0) {
      void markAllAsRead();
    }
  }, [notifications.length]);

  const markRead = useCallback((id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.log("읽음 처리 실패:", error);
      });
  }, []);

  const handleNotifPress = useCallback(
    async (notif: NotificationItem) => {
      markRead(notif.id);

      switch (notif.type) {
        case "member":
          // 가족 참여 알림은 화면 이동 없이 읽음 처리만 수행 (markRead는 상단에서 이미 실행됨)
          break;

        case "mood":
        case "story":
          navigation.goBack();
          setTimeout(() => {
            navigation.navigate("MainTab" as any, {
              screen: "Home",
              params: { selectedMemberId: notif.memberId, _ts: Date.now() },
            });
          }, 100);
          break;

        case "poke":
          // 콕 찌르기 → 홈화면으로 이동 (내 프로필 선택)
          navigation.navigate("MainTab" as any, {
            screen: "Home",
          });
          break;

        case "story_comment":
          navigation.goBack();
          setTimeout(() => {
            navigation.navigate("MainTab" as any, {
              screen: "Home",
              params: {
                selectedMemberId: notif.memberId,
                openCommentPhotoId: notif.photoId,
                _ts: Date.now(),
              },
            });
          }, 100);
          break;

        case "comment":
          // 앨범 댓글 → 해당 사진 상세로 이동
          if (notif.photoId !== null) {
            try {
              const { data: photo } = await supabase
                .from("photos")
                .select("id, image_url, created_at, album_id")
                .eq("id", notif.photoId)
                .single();

              if (photo) {
                const { data: album } = await supabase
                  .from("albums")
                  .select("id, name, max_count, cover_color")
                  .eq("id", photo.album_id)
                  .single();

                const d = new Date(photo.created_at);
                const formattedDate = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;

                navigation.navigate("AlbumDetail", {
                  photoId: photo.id,
                  imageUri: photo.image_url,
                  uploadedAt: formattedDate,
                  folderId: album?.id || photo.album_id,
                  folderName: album?.name || "",
                  folderCount: 0,
                  folderMaxCount: album?.max_count || 20,
                  folderCoverColor: album?.cover_color || "#D4B896",
                });
              }
            } catch (e) {
              console.log("댓글 알림 이동 실패:", e);
            }
          }
          break;

        case "album":
          // 사진 등록 → 해당 앨범으로 이동
          if (notif.folderId !== null) {
            try {
              const { data: album } = await supabase
                .from("albums")
                .select("id, name, max_count, cover_color")
                .eq("id", notif.folderId)
                .single();

              if (album) {
                navigation.navigate("AlbumPhotos", {
                  folderId: album.id,
                  folderName: album.name,
                  folderCount: 0,
                  folderMaxCount: album.max_count || 20,
                  folderCoverColor: album.cover_color || "#D4B896",
                });
              }
            } catch (e) {
              console.log("앨범 알림 이동 실패:", e);
            }
          }
          break;

        case "notice":
          navigation.navigate("NoticeDetail" as any);
          break;
      }
    },
    [markRead, navigation]
  );

  const rootPadding = useMemo(
    () => ({
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
    }),
    [insets.top, insets.bottom]
  );

  return (
    <View style={[styles.root, rootPadding]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.6}>
          <ChevronLeftIcon size={32} color={Colors.textSub} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          notifications.length === 0 && styles.scrollContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" style={styles.overlayIcon}>
              <Path
                d="M8.35206 20.242C8.78721 20.7922 9.34171 21.2364 9.97367 21.541C10.6056 21.8455 11.2985 22.0025 12.0001 22C12.7016 22.0025 13.3945 21.8455 14.0264 21.541C14.6584 21.2364 15.2129 20.7922 15.6481 20.242C13.2271 20.5697 10.773 20.5697 8.35206 20.242ZM18.7501 9V9.704C18.7501 10.549 18.9901 11.375 19.4421 12.078L20.5501 13.801C21.5611 15.375 20.7891 17.514 19.0301 18.011C14.4338 19.3127 9.56635 19.3127 4.97006 18.011C3.21106 17.514 2.43906 15.375 3.45006 13.801L4.55806 12.078C5.01127 11.3692 5.25178 10.5453 5.25106 9.704V9C5.25106 5.134 8.27306 2 12.0001 2C15.7271 2 18.7501 5.134 18.7501 9Z"
                fill={Colors.accent}
              />
            </Svg>
            <Text style={styles.emptyText}>아직 알림이 없어요</Text>
          </View>
        ) : (
          notifications.map((notif) => (
            <Pressable
              key={notif.id}
              onPress={() => handleNotifPress(notif)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: notif.read ? Colors.white : Colors.accentLight },
                pressed && styles.rowPressed,
              ]}
            >
              <NotifIcon notif={notif} />
              <View style={styles.rowBody}>
                <Text style={styles.rowMessage} numberOfLines={2}>
                  {notif.nickname ? (
                    <Text style={styles.rowName}>
                      {notif.nickname}님이{" "}
                    </Text>
                  ) : null}
                  {notif.message}
                </Text>
                {notif.subMessage && (
                  <Text style={styles.rowSubMessage} numberOfLines={1}>
                    {notif.subMessage}
                  </Text>
                )}
                <Text style={styles.rowTime}>{notif.time}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentEmpty: {
    justifyContent: "flex-start",
  },
  empty: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 200,
    gap: 16,
  },
  overlayIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 17,
    fontFamily: "NanumSquareRound-Bold",
    color: Colors.textHint,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowPressed: {
    opacity: 0.92,
  },
  rowBody: {
    flex: 1,
    flexShrink: 1,
  },
  rowMessage: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.text,
    lineHeight: 21,
    marginBottom: 3,
  },
  rowName: {
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
  },
  rowSubMessage: {
    fontSize: 13,
    fontFamily: "Pretendard-Regular",
    color: Colors.textSub,
    lineHeight: 18,
    marginBottom: 6,
  },
  rowTime: {
    fontSize: 12,
    fontFamily: "Pretendard-Regular",
    color: Colors.textHint,
  },
  notifIconPhoto: {
    width: 46,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  notifIconProfile: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notifIconProfileEmoji: {
    fontSize: 24,
    fontFamily: "Pretendard-Regular",
  },
  notifIconSystem: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notifIconSystemEmoji: {
    fontSize: 20,
    fontFamily: "Pretendard-Regular",
  },
});
