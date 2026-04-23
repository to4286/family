import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors } from "../constants/colors";
import { STORY_PHOTO_ASPECT_RATIO } from "../constants/storyPhoto";
import { useStoryImagePicker } from "../hooks/useStoryImagePicker";
import CommentSheet from "../components/CommentSheet";
import type { Comment } from "../components/CommentSheet";
import type { MainTabParamList, MainTabStackParamList } from "../navigation/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Home">,
  NativeStackNavigationProp<MainTabStackParamList>
>;

type Member = {
  id: number;
  nickname: string;
  photoUri?: string;
  isMine: boolean;
  currentMood: number | null;
  photos: { id: number; imageUri: string; uploadedAt: string }[];
  hasUpdate: boolean;
};

type MemberPhoto = Member["photos"][number];

// ─── Data & layout constants ───────────────────────────────────────────────────

/** 가입 시 선택한 가족 유형 텍스트 — Supabase 연동 시 동적 로드 예정 */
const FAMILY_TITLE = "대화가 많은 우리 가족 🏡";

/** 프로필 닉네임·기분 라벨 등 동일 패밀리 텍스트 */
const FONT_NANUM_ROUND_REGULAR = "NanumSquareRound-Regular";
const FONT_NANUM_ROUND_BOLD = "NanumSquareRound-Bold";

const MEMBERS: Member[] = [
  {
    id: 3,
    nickname: "민준",
    isMine: true,
    currentMood: 2,
    photoUri: "https://i.pravatar.cc/150?img=33",
    photos: [],
    hasUpdate: false,
  },
  {
    id: 1,
    nickname: "김철수",
    isMine: false,
    currentMood: 1,
    photoUri: "https://i.pravatar.cc/150?img=12",
    /** id는 시간순으로 증가(오래됨=작은 id, 최신=큰 id) — lastSeen·미시청 비교에 사용 */
    photos: [
      { id: 101, imageUri: "https://picsum.photos/seed/dad2/400/400", uploadedAt: "3시간 전" },
      { id: 102, imageUri: "https://picsum.photos/seed/dad1/400/400", uploadedAt: "2시간 전" },
    ],
    hasUpdate: true,
  },
  {
    id: 4,
    nickname: "지수",
    isMine: false,
    currentMood: 2,
    photoUri: "https://i.pravatar.cc/150?img=68",
    photos: [
      { id: 301, imageUri: "https://picsum.photos/seed/jisu3/400/400", uploadedAt: "14시간 전" },
      { id: 302, imageUri: "https://picsum.photos/seed/jisu2/400/400", uploadedAt: "13시간 전" },
      { id: 303, imageUri: "https://picsum.photos/seed/jisu1/400/400", uploadedAt: "12시간 전" },
    ],
    hasUpdate: true,
  },
  {
    id: 2,
    nickname: "이영희",
    isMine: false,
    currentMood: 0,
    photoUri: "https://i.pravatar.cc/150?img=47",
    photos: [],
    hasUpdate: false,
  },
  {
    id: 5,
    nickname: "하은",
    isMine: false,
    currentMood: null,
    photoUri: "https://i.pravatar.cc/150?img=49",
    photos: [],
    hasUpdate: false,
  },
];

const DUMMY_COMMENTS: Record<number, Comment[]> = {
  1: [
    { id: 1, memberPhotoUri: "https://i.pravatar.cc/150?img=33", memberNickname: "민준", text: "아빠 멋있다!", createdAt: "1시간 전" },
    { id: 2, memberPhotoUri: "https://i.pravatar.cc/150?img=49", memberNickname: "하은", text: "우와 어디야?", createdAt: "30분 전" },
  ],
  101: [
    { id: 3, memberPhotoUri: "https://i.pravatar.cc/150?img=33", memberNickname: "민준", text: "아빠 밥 먹었어?", createdAt: "1시간 전" },
  ],
  102: [],
  301: [
    { id: 4, memberPhotoUri: "https://i.pravatar.cc/150?img=47", memberNickname: "이영희", text: "지수야 밥은 먹었니?", createdAt: "10시간 전" },
  ],
  302: [],
  303: [],
};

const MOODS = [
  { icon: "🌟", label: "너무 행복해!" },
  { icon: "☀️", label: "기분 좋아~" },
  { icon: "☁️", label: "그냥 그래" },
  { icon: "⛈️", label: "힘들어" },
];

type TodayMemoryData = {
  id: number;
  imageUri: string;
  date: string;
};

const TODAY_MEMORY: TodayMemoryData | null = null;

const PROFILE_SIZE = 64;
const PROFILE_GAP = 12;
/** 프로필 가로 스크롤 contentContainer 좌우 패딩 (대칭) */
const PROFILE_SCROLL_INSET = 16;
/** 메인 세로 ScrollView content 하단 여백 (safe area 제외 추가 픽셀) */
const MAIN_SCROLL_EXTRA_BOTTOM = 100;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
/** 24: familyCard marginHorizontal, 16: selectedPanel paddingHorizontal */
const PHOTO_WIDTH = SCREEN_WIDTH - 24 * 2 - 16 * 2;

const CARD_SURFACE_SHADOW = {
  shadowColor: "#8B6914",
  shadowOffset: { width: 1, height: 3 },
  shadowOpacity: 0.15,
  shadowRadius: 1.5,
  elevation: 3,
};

const headerControlShadow = {
  shadowColor: "#8B6914",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.12,
  shadowRadius: 3,
  elevation: 2,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function sortMembersForDisplay(list: Member[], updatesMap: Record<number, boolean>): Member[] {
  const mine = list.filter((m) => m.isMine);
  const others = list.filter((m) => !m.isMine);
  const withUpdates = others.filter((m) => updatesMap[m.id]);
  const withoutUpdates = others.filter((m) => !updatesMap[m.id]);
  return [...mine, ...withUpdates, ...withoutUpdates];
}

/**
 * `photos`는 [가장 오래됨, …, 가장 최신] (스와이프로 오른쪽으로 갈수록 최신)
 * @param lastSeenId 마지막으로 본 사진 id. `undefined`면 기록 없음 → 맨 끝(최신)에서 시작
 * @returns 첫 미시청 슬롯 index. 전부 봤거나 볼 것 없으면 `photos.length - 1`
 */
function findFirstUnreadIndex(photos: MemberPhoto[], lastSeenId: number | undefined): number {
  if (photos.length === 0) return 0;
  if (lastSeenId === undefined) return photos.length - 1;
  const i = photos.findIndex((p) => p.id > lastSeenId);
  if (i === -1) return photos.length - 1;
  return i;
}

// ─── Presentational pieces (재사용) ────────────────────────────────────────────

function UploadTimeBadge({ time }: { time: string }) {
  return (
    <View style={styles.uploadTimeBadge} pointerEvents="none">
      <Text style={styles.uploadTimeText}>{time}</Text>
    </View>
  );
}

function RoundIconButton({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.photoActionBtn}
      onPress={onPress ?? (() => {})}
      activeOpacity={0.85}
    >
      <Text style={styles.photoActionBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function TodayMemoryCard({ memory }: { memory: TodayMemoryData | null }) {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  return (
    <View style={styles.todayMemory}>
      <Text style={styles.todayTitle}>오늘의 추억</Text>

      {memory ? (
        <TouchableOpacity style={styles.todayImageWrapper} activeOpacity={0.9} onPress={() => {}}>
          <Image source={{ uri: memory.imageUri }} style={styles.todayImage} resizeMode="cover" />
          <View style={styles.todayDateBadge} pointerEvents="none">
            <Text style={styles.todayDateText}>{memory.date}</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.todayEmptyWrapper}>
          <Text style={styles.todayEmptyText}>가족과 함께한 추억을 등록해보세요</Text>
          <TouchableOpacity
            style={styles.todayEmptyBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Album")}
          >
            <Text style={styles.todayEmptyBtnText}>앨범으로 이동</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

type SelfMoodPickerProps = {
  selectedMood: number;
  savedMood: number | null;
  onSelectMood: (index: number) => void;
  onSave: () => void;
};

function SelfMoodPicker({ selectedMood, savedMood, onSelectMood, onSave }: SelfMoodPickerProps) {
  return (
    <View style={styles.selfMoodBlock}>
      <Text style={styles.moodGuideText}>현재 기분을 선택해주세요</Text>
      <View style={styles.moodIconRow}>
        {MOODS.map((mood, i) => {
          const selected = selectedMood === i;
          return (
            <TouchableOpacity
              key={mood.label}
              onPress={() => onSelectMood(i)}
              activeOpacity={0.85}
              style={styles.moodItem}
            >
              <View
                style={[
                  styles.moodIconCircle,
                  selected
                    ? {
                        backgroundColor: Colors.accentLight,
                        borderColor: Colors.accent,
                        borderWidth: 2,
                      }
                    : {
                        backgroundColor: Colors.surface,
                        borderColor: Colors.border,
                        borderWidth: 1.5,
                      },
                ]}
              >
                <Text style={styles.moodIconEmoji}>{mood.icon}</Text>
              </View>
              <Text
                style={[styles.moodLabel, { color: selected ? Colors.accent : Colors.textHint }]}
              >
                {mood.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedMood !== savedMood && (
        <TouchableOpacity style={styles.saveMoodBtn} onPress={onSave} activeOpacity={0.9}>
          <Text style={styles.saveMoodBtnText}>저장하기</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function OtherMoodReadOnly({ moodIndex }: { moodIndex: number | null }) {
  if (moodIndex === null || !MOODS[moodIndex]) {
    return (
      <View style={styles.otherMoodBlock}>
        <Text style={styles.otherMoodPlaceholder}>아직 기분을 표시하지 않았어요</Text>
      </View>
    );
  }
  const mood = MOODS[moodIndex];
  return (
    <View style={styles.otherMoodBlock}>
      <View style={styles.otherMoodSingle}>
        <View style={styles.otherMoodCircle}>
          <Text style={styles.otherMoodEmoji}>{mood.icon}</Text>
        </View>
        <Text style={styles.otherMoodLabel}>{mood.label}</Text>
      </View>
    </View>
  );
}

const MAX_VISIBLE_DOTS = 5;
const INSTAGRAM_DOT_SIZE_ACTIVE = 8;
const INSTAGRAM_DOT_SIZE_ADJACENT = 6;
const INSTAGRAM_DOT_SIZE_FAR = 4;

function InstagramIndicator({ total, currentIndex }: { total: number; currentIndex: number }) {
  if (total <= 1) return null;

  const half = Math.floor(MAX_VISIBLE_DOTS / 2);
  let startIndex = currentIndex - half;
  let endIndex = currentIndex + half;

  if (startIndex < 0) {
    startIndex = 0;
    endIndex = Math.min(MAX_VISIBLE_DOTS - 1, total - 1);
  }
  if (endIndex >= total) {
    endIndex = total - 1;
    startIndex = Math.max(0, endIndex - MAX_VISIBLE_DOTS + 1);
  }

  const dots: React.ReactNode[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const distance = Math.abs(i - currentIndex);
    let size = INSTAGRAM_DOT_SIZE_ACTIVE;
    if (distance === 1) size = INSTAGRAM_DOT_SIZE_ADJACENT;
    if (distance >= 2) size = INSTAGRAM_DOT_SIZE_FAR;

    const isActive = i === currentIndex;

    dots.push(
      <View
        key={i}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isActive ? Colors.accent : Colors.border,
          marginHorizontal: 2,
        }}
      />
    );
  }

  return <View style={styles.indicatorRow}>{dots}</View>;
}

type PhotoSwiperProps = {
  memberId: number;
  photos: MemberPhoto[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  isMine: boolean;
  nickname: string;
  onCommentPress: (photoId: number) => void;
  commentCounts: Record<number, number>;
  onPoke: () => void;
  onAddPhoto?: () => void;
};

function PhotoSwiper({
  memberId,
  photos,
  currentIndex,
  onIndexChange,
  isMine,
  nickname,
  onCommentPress,
  commentCounts,
  onPoke,
  onAddPhoto,
}: PhotoSwiperProps) {
  const flatListRef = useRef<FlatList<MemberPhoto>>(null);

  useLayoutEffect(() => {
    if (photos.length === 0) return;
    const safe = Math.max(0, Math.min(currentIndex, photos.length - 1));
    const raf = requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({ index: safe, animated: false });
    });
    return () => cancelAnimationFrame(raf);
  }, [photos, currentIndex, memberId]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const raw = Math.round(e.nativeEvent.contentOffset.x / PHOTO_WIDTH);
      const newIndex = Math.max(0, Math.min(photos.length - 1, raw));
      onIndexChange(newIndex);
    },
    [onIndexChange, photos.length]
  );

  if (photos.length === 0) {
    if (isMine) {
      return (
        <View style={styles.emptyPhotoSelf}>
          <View style={{ alignItems: "center", gap: 6 }}>
            <Text style={styles.emptyPhotoCaption}>가족들에게 일상을 공유해보세요</Text>
            <Text style={styles.emptyPhotoCaption}>사진은 24시간이 지나면 사라집니다</Text>
          </View>
          <TouchableOpacity
            style={styles.emptyPhotoBtn}
            activeOpacity={0.8}
            onPress={() => onAddPhoto?.()}
          >
            <Text style={styles.emptyPhotoBtnText}>사진 추가하기</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyPhotoOther}>
        <Text style={styles.emptyPhotoOtherText}>
          {nickname}님은 지금 무엇을 하고 있을까요?
        </Text>
        <TouchableOpacity style={styles.pokeBtn} activeOpacity={0.9} onPress={onPoke}>
          <Text style={styles.pokeBtnText}>콕 찌르기 👈</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      {/* photos[0] = 이전(왼쪽), 끝 = 최신(오른쪽) — 가로 스와이프로 '이어보기' */}
      <FlatList
        ref={flatListRef}
        style={{ width: PHOTO_WIDTH }}
        data={photos}
        keyExtractor={(item) => String(item.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: PHOTO_WIDTH,
          offset: PHOTO_WIDTH * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
            });
          }, 100);
        }}
        renderItem={({ item }) => (
          <View style={[styles.photoFrame, { width: PHOTO_WIDTH }]}>
            <Image
              source={{ uri: item.imageUri }}
              style={[styles.photoImage, { width: PHOTO_WIDTH }]}
              resizeMode="cover"
            />
            <UploadTimeBadge time={item.uploadedAt} />
            <View style={[styles.photoActionsRow, !isMine && styles.photoActionsSingle]}>
              <View style={styles.commentBtnWrap}>
                <TouchableOpacity
                  style={styles.photoActionBtn}
                  onPress={() => onCommentPress(item.id)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.photoActionBtnText}>💬</Text>
                </TouchableOpacity>
                {(commentCounts[item.id] ?? 0) > 0 && (
                  <View style={styles.commentCountBadge}>
                    <Text style={styles.commentCountText}>{commentCounts[item.id]}</Text>
                  </View>
                )}
              </View>
              {isMine && (
                <TouchableOpacity
                  style={styles.addPhotoBtn}
                  onPress={() => onAddPhoto?.()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.addPhotoBtnText}>+</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />

      {photos.length > 1 && (
        <InstagramIndicator total={photos.length} currentIndex={currentIndex} />
      )}
    </View>
  );
}

// ─── HomeScreen ─────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const mainScrollRef = useRef<ScrollView>(null);

  const [selectedMemberId, setSelectedMemberId] = useState(3);
  const [members, setMembers] = useState<Member[]>(MEMBERS);
  const [selectedMood, setSelectedMood] = useState(2);
  const [updates, setUpdates] = useState<Record<number, boolean>>(
    Object.fromEntries(MEMBERS.map((m) => [m.id, m.isMine ? false : m.hasUpdate]))
  );

  const [photoIndices, setPhotoIndices] = useState<Record<number, number>>({});
  const [lastSeenPhotoIds, setLastSeenPhotoIds] = useState<Record<number, number>>({});

  const [showComments, setShowComments] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastContent, setToastContent] = useState({ icon: "✅", text: "기분이 변경되었어요" });
  const toastAnim = useRef(new Animated.Value(100)).current;

  const triggerToast = (icon: string, text: string) => {
    setToastContent({ icon, text });
    setShowToast(true);
    Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 100, duration: 300, useNativeDriver: true }).start(() =>
        setShowToast(false)
      );
    }, 1500);
  };

  const [commentPhotoId, setCommentPhotoId] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, Comment[]>>(DUMMY_COMMENTS);

  const { pickFromLibrary } = useStoryImagePicker();

  const sortedMembers = useMemo(
    () => sortMembersForDisplay(members, updates),
    [members, updates]
  );

  const handleAddMyPhoto = useCallback(async () => {
    const uri = await pickFromLibrary();
    if (!uri) return;
    const newPhoto: MemberPhoto = { id: Date.now(), imageUri: uri, uploadedAt: "방금 전" };
    setMembers((prev) =>
      prev.map((m) => (m.isMine ? { ...m, photos: [...m.photos, newPhoto] } : m))
    );
    const me = members.find((m) => m.isMine);
    if (me) {
      const lastIdx = me.photos.length;
      setPhotoIndices((prev) => ({ ...prev, [me.id]: lastIdx }));
      setLastSeenPhotoIds((prev) => ({ ...prev, [me.id]: newPhoto.id }));
    }
  }, [pickFromLibrary, members]);

  const handlePhotoViewChange = useCallback(
    (idx: number) => {
      const m = members.find((x) => x.id === selectedMemberId);
      if (!m?.photos[idx]) return;
      const pid = m.photos[idx].id;
      setPhotoIndices((prev) => ({ ...prev, [selectedMemberId]: idx }));
      setLastSeenPhotoIds((prev) => ({ ...prev, [selectedMemberId]: pid }));
    },
    [selectedMemberId, members]
  );

  /** 구성원 탭 전환 시에만: 첫 미시청(또는 최신) 슬롯으로 이어보기 — lastSeen/stale 루프 방지를 위해 deps는 memberId만 */
  useLayoutEffect(() => {
    const m = members.find((x) => x.id === selectedMemberId);
    if (!m || m.photos.length === 0) return;
    const lastSeen = lastSeenPhotoIds[selectedMemberId];
    const nextIdx = findFirstUnreadIndex(m.photos, lastSeen);
    const pid = m.photos[nextIdx].id;
    setPhotoIndices((prev) => ({ ...prev, [selectedMemberId]: nextIdx }));
    setLastSeenPhotoIds((prev) => ({ ...prev, [selectedMemberId]: pid }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 멤버 전환 시점의 시청 기록만 읽고, 스와이프로 갱신된 lastSeen에 반응하지 않음
  }, [selectedMemberId]);

  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedMemberId),
    [members, selectedMemberId]
  );

  const currentPhotoIndex = photoIndices[selectedMemberId] ?? 0;

  useEffect(() => {
    const refresh = route.params?.refresh;
    if (refresh === undefined) return;
    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
    console.log("홈 화면 가족 데이터를 새로고침합니다...");
  }, [route.params?.refresh]);

  useEffect(() => {
    const m = members.find((mm) => mm.id === selectedMemberId);
    if (m?.isMine) {
      setSelectedMood(m.currentMood ?? 2);
    }
  }, [selectedMemberId, members]);

  const handleSaveMood = () => {
    setMembers((prev) =>
      prev.map((m) => (m.id === selectedMemberId ? { ...m, currentMood: selectedMood } : m))
    );
    triggerToast("✅", "기분이 변경되었어요");
  };

  const handleOpenComments = (photoId: number) => {
    setCommentPhotoId(photoId);
    setShowComments(true);
  };

  const handleCommentSubmit = (text: string) => {
    if (commentPhotoId === null) return;
    const me = members.find((m) => m.isMine);
    const newComment: Comment = {
      id: Date.now(),
      memberPhotoUri: me?.photoUri,
      memberNickname: me?.nickname ?? "나",
      text,
      createdAt: "방금 전",
    };
    setComments((prev) => ({
      ...prev,
      [commentPhotoId]: [...(prev[commentPhotoId] || []), newComment],
    }));
  };

  const commentCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    Object.entries(comments).forEach(([key, arr]) => {
      counts[Number(key)] = arr.length;
    });
    return counts;
  }, [comments]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{FAMILY_TITLE}</Text>
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

      <ScrollView
        ref={mainScrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + MAIN_SCROLL_EXTRA_BOTTOM }}
        nestedScrollEnabled
      >
        <View style={styles.familyCard}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.profileScrollContent}
            nestedScrollEnabled
          >
            {sortedMembers.map((m, index) => {
              const selected = m.id === selectedMemberId;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.profileItem,
                    selected && styles.profileItemSelected,
                    index < sortedMembers.length - 1 && { marginRight: PROFILE_GAP },
                  ]}
                  onPress={() => {
                    setSelectedMemberId(m.id);
                    setUpdates((prev) => ({ ...prev, [m.id]: false }));
                  }}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.profileImageWrap,
                      updates[m.id] && styles.profileImageWrapHasUpdate,
                    ]}
                  >
                    <Image
                      source={{ uri: m.photoUri }}
                      style={styles.profileImage}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={styles.profileNickname} numberOfLines={1}>
                    {m.isMine ? "나" : m.nickname}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedMember && (
            <View style={styles.selectedPanel}>
              {selectedMember.isMine ? (
                <>
                  <SelfMoodPicker
                    selectedMood={selectedMood}
                    savedMood={selectedMember.currentMood}
                    onSelectMood={setSelectedMood}
                    onSave={handleSaveMood}
                  />
                  <View style={styles.sectionDivider} />
                  <PhotoSwiper
                    memberId={selectedMemberId}
                    photos={selectedMember.photos}
                    currentIndex={currentPhotoIndex}
                    onIndexChange={handlePhotoViewChange}
                    isMine
                    nickname={selectedMember.nickname}
                    onCommentPress={handleOpenComments}
                    commentCounts={commentCounts}
                    onPoke={() => {}}
                    onAddPhoto={handleAddMyPhoto}
                  />
                </>
              ) : (
                <>
                  <OtherMoodReadOnly moodIndex={selectedMember.currentMood} />
                  <PhotoSwiper
                    memberId={selectedMemberId}
                    photos={selectedMember.photos}
                    currentIndex={currentPhotoIndex}
                    onIndexChange={handlePhotoViewChange}
                    isMine={false}
                    nickname={selectedMember.nickname}
                    onCommentPress={handleOpenComments}
                    commentCounts={commentCounts}
                    onPoke={() =>
                      triggerToast("👈", `${selectedMember.nickname}님을 콕 찔렀어요`)
                    }
                  />
                  <TouchableOpacity
                    style={styles.learnMoreBtn}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (selectedMember) {
                        navigation.navigate("ConceptCategories", {
                          memberId: selectedMember.id,
                          memberNickname: selectedMember.nickname,
                        });
                      }
                    }}
                  >
                    <Text style={styles.learnMoreBtnText}>더 알아가기</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        <TodayMemoryCard memory={TODAY_MEMORY} />
      </ScrollView>

      {(() => {
        const currentPhoto = selectedMember?.photos.find((p) => p.id === commentPhotoId);
        const me = members.find((m) => m.isMine);
        return (
          <CommentSheet
            visible={showComments}
            onClose={() => setShowComments(false)}
            comments={commentPhotoId !== null ? (comments[commentPhotoId] || []) : []}
            onSubmit={handleCommentSubmit}
            photoUri={currentPhoto?.imageUri}
            myPhotoUri={me?.photoUri}
          />
        );
      })()}

      {/* 토스트 메시지 (캡슐형 디자인) */}
      {showToast && (
        <Animated.View
          style={[styles.toastContainer, { transform: [{ translateY: toastAnim }] }]}
        >
          <Text style={styles.toastIcon}>{toastContent.icon}</Text>
          <Text style={styles.toastText}>{toastContent.text}</Text>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "NanumSquareRound-ExtraBold",
    color: Colors.text,
  },
  notifBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.82)",
    alignItems: "center",
    justifyContent: "center",
    ...headerControlShadow,
  },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.white,
  },

  familyCard: {
    marginHorizontal: 24,
    marginTop: 12,
    paddingTop: 16,
    backgroundColor: Colors.white,
    borderRadius: 24,
    ...CARD_SURFACE_SHADOW,
  },
  profileScrollContent: {
    paddingLeft: PROFILE_SCROLL_INSET,
    paddingRight: PROFILE_SCROLL_INSET,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  profileItem: {
    alignItems: "center",
    width: PROFILE_SIZE + 24,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  profileItemSelected: {
    backgroundColor: "#F0D9C4",
  },
  profileImageWrap: {
    width: PROFILE_SIZE + 6,
    height: PROFILE_SIZE + 6,
    borderRadius: (PROFILE_SIZE + 6) / 2,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  profileImageWrapHasUpdate: {
    borderWidth: 2.5,
    borderColor: Colors.accent,
  },
  profileImage: {
    width: PROFILE_SIZE,
    height: PROFILE_SIZE,
    borderRadius: PROFILE_SIZE / 2,
    backgroundColor: Colors.surface,
  },
  profileNickname: {
    fontSize: 14,
    fontFamily: FONT_NANUM_ROUND_BOLD,
    color: Colors.text,
    marginTop: 4,
    textAlign: "center",
    maxWidth: 80,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 20,
  },
  selectedPanel: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },

  selfMoodBlock: {
    marginBottom: 0,
  },
  moodGuideText: {
    fontSize: 13,
    fontFamily: "NanumSquareRound-Bold",
    color: Colors.textSub,
    textAlign: "center",
    marginBottom: 16,
  },
  moodIconRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 0,
  },
  moodItem: {
    alignItems: "center",
    gap: 6,
  },
  moodIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  moodIconEmoji: {
    fontSize: 22,
  },
  moodLabel: {
    fontSize: 10,
    fontFamily: FONT_NANUM_ROUND_REGULAR,
    textAlign: "center",
    lineHeight: 14,
  },
  saveMoodBtn: {
    width: "100%",
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  saveMoodBtnText: {
    fontSize: 14,
    fontFamily: "Pretendard-Medium",
    color: Colors.white,
  },

  otherMoodBlock: {
    marginBottom: 16,
    alignItems: "center",
  },
  otherMoodSingle: {
    alignItems: "center",
    gap: 8,
  },
  otherMoodCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accentLight,
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  otherMoodEmoji: {
    fontSize: 30,
  },
  otherMoodLabel: {
    fontSize: 13,
    fontFamily: FONT_NANUM_ROUND_BOLD,
    color: Colors.accent,
  },
  otherMoodPlaceholder: {
    fontSize: 13,
    fontFamily: FONT_NANUM_ROUND_REGULAR,
    color: Colors.textHint,
    textAlign: "center",
    marginBottom: 12,
  },

  photoFrame: {
    position: "relative",
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 16,
    backgroundColor: Colors.surface,
  },
  uploadTimeBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  uploadTimeText: {
    fontSize: 11,
    fontFamily: "Pretendard-Regular",
    color: Colors.white,
  },
  photoActionsRow: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    gap: 8,
  },
  photoActionsSingle: {
    gap: 0,
  },
  indicatorRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  photoActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoActionBtnText: {
    fontSize: 16,
    color: Colors.white,
  },
  addPhotoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBtnText: {
    fontSize: 22,
    color: Colors.white,
    lineHeight: 24,
  },
  commentBtnWrap: {
    position: "relative",
  },
  commentCountBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  commentCountText: {
    fontSize: 10,
    fontFamily: "Pretendard-Medium",
    color: Colors.white,
  },

  emptyPhotoSelf: {
    width: "100%",
    aspectRatio: STORY_PHOTO_ASPECT_RATIO,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  emptyPhotoCaption: {
    fontSize: 13,
    fontFamily: "NanumSquareRound-Regular",
    color: Colors.textSub,
    textAlign: "center",
  },
  emptyPhotoBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: Colors.accent,
  },
  emptyPhotoBtnText: {
    fontSize: 13,
    fontFamily: "Pretendard-Medium",
    color: Colors.white,
  },

  emptyPhotoOther: {
    width: "100%",
    aspectRatio: STORY_PHOTO_ASPECT_RATIO,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyPhotoOtherText: {
    fontSize: 13,
    fontFamily: "NanumSquareRound-Regular",
    color: Colors.textHint,
    textAlign: "center",
  },
  pokeBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: Colors.accent,
  },
  pokeBtnText: {
    fontSize: 13,
    fontFamily: "Pretendard-Medium",
    color: Colors.white,
  },
  learnMoreBtn: {
    marginTop: 16,
    width: "100%",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  learnMoreBtnText: {
    fontSize: 14,
    fontFamily: "Pretendard-Medium",
    color: Colors.white,
  },

  todayMemory: {
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 24,
    backgroundColor: Colors.white,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    ...CARD_SURFACE_SHADOW,
  },
  todayTitle: {
    fontSize: 17,
    fontFamily: "NanumSquareRound-ExtraBold",
    color: Colors.text,
    marginBottom: 26,
  },
  todayImageWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  todayImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
  },
  todayDateBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  todayDateText: {
    fontSize: 12,
    fontFamily: "Pretendard-Regular",
    color: Colors.white,
  },
  todayEmptyWrapper: {
    height: 200,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  todayEmptyText: {
    fontSize: 14,
    fontFamily: "NanumSquareRound-Regular",
    color: Colors.textSub,
  },
  todayEmptyBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: Colors.accent,
  },
  todayEmptyBtnText: {
    fontSize: 13,
    fontFamily: "Pretendard-Medium",
    color: Colors.white,
  },
  toastContainer: {
    position: "absolute",
    bottom: 130,
    left: 24, // 화면 양옆으로 뻗도록 좌측 여백 고정
    right: 24, // 화면 양옆으로 뻗도록 우측 여백 고정
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start", // 왼쪽 정렬!
    backgroundColor: "rgba(46, 34, 22, 0.85)",
    paddingVertical: 18,
    paddingHorizontal: 24, // 왼쪽 정렬 시 시작 여백
    borderRadius: 12,
    gap: 14, // 이모티콘과 텍스트 사이 간격 유지
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
    color: "#FFFFFF", // 진한 배경에 맞춰 흰색 텍스트로 변경
  },
});
