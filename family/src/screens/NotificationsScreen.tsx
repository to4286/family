import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";

import { Colors } from "../constants/colors";
import type { MainTabStackParamList } from "../navigation/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifTypeKey = keyof typeof NOTIF_TYPES;

export type NotificationItem = {
  id: number;
  type: NotifTypeKey;
  nickname: string | null;
  message: string;
  time: string;
  read: boolean;
  emoji: string | null;
  /** 댓글 썸네일 자리 표시 색상 (추후 photoSource + Image로 교체) */
  photoColor: string | null;
};

type NavigationProp = NativeStackNavigationProp<MainTabStackParamList>;

// ─── 알림 유형 정의 ───────────────────────────────────────────────────────────

const NOTIF_TYPES = {
  letter: { icon: "💌", iconType: "profile", label: "편지 도착" },
  mood: { icon: "🌞", iconType: "profile", label: "기분 변경" },
  message: { icon: "💬", iconType: "profile", label: "메시지 변경" },
  comment: { icon: "💬", iconType: "photo", label: "앨범 댓글" },
  album: { icon: "🖼️", iconType: "profile", label: "사진 등록" },
  member: { icon: "👋", iconType: "profile", label: "구성원 참여" },
  temp_up: { icon: "🌡️", iconType: "system", label: "온도 상승" },
  temp_down: { icon: "🌡️", iconType: "system", label: "온도 하락" },
  notice: { icon: "📢", iconType: "system", label: "공지사항" },
} as const;

// ─── 샘플 데이터 ─────────────────────────────────────────────────────────────

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: 1, type: "letter", nickname: "이영희", message: "편지를 보냈어요", time: "방금 전", read: false, emoji: "👩", photoColor: null },
  { id: 2, type: "message", nickname: "김철수", message: "새로운 메세지를 남겼어요", time: "5분 전", read: false, emoji: "👨", photoColor: null },
  { id: 3, type: "comment", nickname: "하은", message: "사진에 댓글을 남겼어요", time: "30분 전", read: false, emoji: "👧", photoColor: "#D4B896" },
  { id: 4, type: "temp_up", nickname: null, message: "집 온도가 75도를 돌파했어요!", time: "1시간 전", read: false, emoji: null, photoColor: null },
  { id: 5, type: "album", nickname: "하은", message: "앨범에 사진을 등록했어요", time: "3시간 전", read: true, emoji: "👧", photoColor: null },
  { id: 6, type: "mood", nickname: "민준", message: "기분을 변경했어요", time: "5시간 전", read: true, emoji: "🧒", photoColor: null },
  { id: 7, type: "message", nickname: "이영희", message: "새로운 메세지를 남겼어요", time: "어제", read: true, emoji: "👩", photoColor: null },
  { id: 8, type: "comment", nickname: "김철수", message: "사진에 댓글을 남겼어요", time: "어제", read: true, emoji: "👨", photoColor: "#C9A882" },
  { id: 9, type: "temp_down", nickname: null, message: "집 온도가 50도 아래로 내려갔어요", time: "2일 전", read: true, emoji: null, photoColor: null },
  { id: 10, type: "member", nickname: "지수", message: "가족 공간에 합류했어요", time: "3일 전", read: true, emoji: "👦", photoColor: null },
  { id: 11, type: "notice", nickname: null, message: "서비스 업데이트 안내", time: "4일 전", read: true, emoji: null, photoColor: null },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** 받침 여부에 따라 '가' / '이가' 반환 */
export function getSubjectParticle(name: string): string {
  if (!name) return "";
  const code = name.charCodeAt(name.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return "가";
  return (code - 0xac00) % 28 === 0 ? "가" : "이가";
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

  if (typeDef.iconType === "photo" && notif.photoColor) {
    return (
      <View
        style={[
          styles.notifIconPhoto,
          { backgroundColor: notif.photoColor },
        ]}
      />
    );
  }

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
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    INITIAL_NOTIFICATIONS
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

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
        <View style={styles.headerSideLeft}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.headerBackHit,
              pressed && styles.headerBackPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
          >
            <ChevronLeftIcon size={32} color={Colors.textSub} />
          </Pressable>
        </View>
        <View style={styles.headerTitleSlot}>
          <Text style={styles.headerTitle}>알림</Text>
        </View>
        <View style={styles.headerSideRight}>
          {unreadCount > 0 ? (
            <Pressable
              onPress={markAllRead}
              style={({ pressed }) => pressed && styles.markAllPressed}
              accessibilityRole="button"
              accessibilityLabel="전체 읽음"
            >
              <Text style={styles.markAllText}>전체 읽음</Text>
            </Pressable>
          ) : null}
        </View>
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
            <Text style={styles.emptyBell}>🔔</Text>
            <Text style={styles.emptyText}>아직 알림이 없어요</Text>
          </View>
        ) : (
          notifications.map((notif) => (
            <Pressable
              key={notif.id}
              onPress={() => markRead(notif.id)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: notif.read ? Colors.white : Colors.accentLight },
                pressed && styles.rowPressed,
              ]}
            >
              <NotifIcon notif={notif} />
              <View style={styles.rowBody}>
                <Text style={styles.rowMessage} numberOfLines={3}>
                  {notif.nickname ? (
                    <Text style={styles.rowName}>
                      {notif.nickname}
                      {getSubjectParticle(notif.nickname)}{" "}
                    </Text>
                  ) : null}
                  {notif.message}
                </Text>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerSideLeft: {
    width: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginLeft: -8,
  },
  headerSideRight: {
    width: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  headerTitleSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
  },
  headerBackHit: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBackPressed: {
    opacity: 0.6,
  },
  markAllText: {
    fontSize: 13,
    color: Colors.accent,
    fontFamily: "Pretendard-Medium",
  },
  markAllPressed: {
    opacity: 0.7,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentEmpty: {
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyBell: {
    fontSize: 40,
    fontFamily: "Pretendard-Regular",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
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
