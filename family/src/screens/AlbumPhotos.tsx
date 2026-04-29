import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Animated,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { decode } from "base64-arraybuffer";
import { File } from "expo-file-system/next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import CheckCircleIcon from "../components/CheckCircleIcon";
import Svg, { Path } from "react-native-svg";
import { Colors } from "../constants/colors";
import type { MainTabStackParamList } from "../navigation/types";
import { handleMultipleImagePick } from "../utils/imagePicker";
import { supabase } from "../utils/supabase";
import { compressImage } from "../utils/imageCompress";

type Props = NativeStackScreenProps<MainTabStackParamList, "AlbumPhotos">;

// ─── Photo model & palette ─────────────────────────────────────────────────────

type Photo = {
  id: number;
  imageUri?: string;
  color: string;
  uploadedAt: string;
};

const PHOTO_COLORS = ["#D4B896", "#C9A882", "#E8C9A0", "#B89878", "#DDBF9A", "#C4A87E", "#E0C8A8", "#BFA080", "#D8BC94"];

/** 갤러리 표시용 날짜 문자열 → INSERT용 ISO (없으면 undefined) */
function galleryLabelToOriginalDateIso(displayDate: string): string | undefined {
  const m = displayDate.trim().match(/^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일$/);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
  if (Number.isNaN(dt.getTime())) return undefined;
  return dt.toISOString();
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_GAP = 3;
const GRID_PADDING = 3;
const GRID_COL3 = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

// ─── ChevronLeft (알림 화면과 동일) ────────────────────────────────────────────

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

// ─── Photo Grid ────────────────────────────────────────────────────────────────

function PhotoGrid({ photos, onPhotoPress }: { photos: Photo[]; onPhotoPress: (photo: Photo) => void }) {
  const rows: React.ReactNode[] = [];
  let i = 0;
  const patterns = [1, 2, 1, 3];
  let patIdx = 0;

  while (i < photos.length) {
    const pat = patterns[patIdx % 4];
    patIdx++;

    if (pat === 1 && i + 2 < photos.length) {
      const p = [photos[i], photos[i + 1], photos[i + 2]];
      rows.push(
        <View key={`r${i}`} style={{ flexDirection: "row", gap: GRID_GAP, marginBottom: GRID_GAP }}>
          {p.map((ph) => (
            <TouchableOpacity key={ph.id} onPress={() => onPhotoPress(ph)} activeOpacity={0.9}
              style={{ width: GRID_COL3, height: GRID_COL3, borderRadius: 4, backgroundColor: ph.color, overflow: "hidden" }}>
              {ph.imageUri && (
                <Image
                  source={{ uri: ph.imageUri }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={200}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      );
      i += 3;
    } else if (pat === 2) {
      const big = photos[i]!;
      const sm1 = i + 1 < photos.length ? photos[i + 1]! : null;
      const sm2 = i + 2 < photos.length ? photos[i + 2]! : null;
      const bigSize = GRID_COL3 * 2 + GRID_GAP;

      rows.push(
        <View key={`r${i}`} style={{ flexDirection: "row", gap: GRID_GAP, marginBottom: GRID_GAP }}>
          <TouchableOpacity
            onPress={() => onPhotoPress(big)}
            activeOpacity={0.9}
            style={{
              width: bigSize,
              height: bigSize,
              borderRadius: 4,
              backgroundColor: big.color,
              overflow: "hidden",
            }}
          >
            {big.imageUri && (
              <Image
                source={{ uri: big.imageUri }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
              />
            )}
          </TouchableOpacity>

          {(sm1 || sm2) && (
            <View style={{ gap: GRID_GAP }}>
              {sm1 && (
                <TouchableOpacity
                  onPress={() => onPhotoPress(sm1)}
                  activeOpacity={0.9}
                  style={{
                    width: GRID_COL3,
                    height: GRID_COL3,
                    borderRadius: 4,
                    backgroundColor: sm1.color,
                    overflow: "hidden",
                  }}
                >
                  {sm1.imageUri && (
                    <Image
                      source={{ uri: sm1.imageUri }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={200}
                    />
                  )}
                </TouchableOpacity>
              )}
              {sm2 && (
                <TouchableOpacity
                  onPress={() => onPhotoPress(sm2)}
                  activeOpacity={0.9}
                  style={{
                    width: GRID_COL3,
                    height: GRID_COL3,
                    borderRadius: 4,
                    backgroundColor: sm2.color,
                    overflow: "hidden",
                  }}
                >
                  {sm2.imageUri && (
                    <Image
                      source={{ uri: sm2.imageUri }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={200}
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      );
      i += sm2 ? 3 : sm1 ? 2 : 1;
    } else if (pat === 3 && i < photos.length) {
      const ph = photos[i];
      rows.push(
        <TouchableOpacity key={`r${i}`} onPress={() => onPhotoPress(ph)} activeOpacity={0.9}
          style={{ width: "100%", height: 220, borderRadius: 4, backgroundColor: ph.color, marginBottom: GRID_GAP, overflow: "hidden" }}>
          {ph.imageUri && (
            <Image
              source={{ uri: ph.imageUri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
          )}
        </TouchableOpacity>
      );
      i += 1;
    } else {
      const remaining = photos.slice(i);
      rows.push(
        <View key={`r${i}`} style={{ flexDirection: "row", gap: GRID_GAP, marginBottom: GRID_GAP }}>
          {remaining.map((ph) => (
            <TouchableOpacity key={ph.id} onPress={() => onPhotoPress(ph)} activeOpacity={0.9}
              style={{ width: GRID_COL3, height: GRID_COL3, borderRadius: 4, backgroundColor: ph.color, overflow: "hidden" }}>
              {ph.imageUri && (
                <Image
                  source={{ uri: ph.imageUri }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={200}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      );
      break;
    }
  }
  return <View style={{ padding: GRID_PADDING }}>{rows}</View>;
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function AlbumPhotosScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainTabStackParamList>>();
  const { folderId, folderName, folderCount, folderMaxCount, folderCoverColor } = route.params;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [heroPhoto, setHeroPhoto] = useState<Photo | undefined>(undefined);

  const [showToast, setShowToast] = useState(false);
  const [toastContent, setToastContent] = useState({ icon: "", text: "" });
  const toastAnim = useRef(new Animated.Value(300)).current;
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  const loadPhotos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("photos")
        .select("id, image_url, created_at")
        .eq("album_id", folderId)
        // 최신 날짜(오늘에 가까운 순)가 그리드 왼쪽 상단부터 오도록
        .order("created_at", { ascending: false });

      if (error) {
        console.log("사진 목록 조회 실패:", error);
        return;
      }

      const photos = data || [];

      if (isMountedRef.current) {
        // DB의 image_url을 UI가 기대하는 imageUri로 변환
        const mappedPhotos = (photos || []).map((p, idx) => {
          const d = new Date(p.created_at as string);
          const formattedDate = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;

          return {
            id: p.id,
            imageUri: p.image_url,
            color: PHOTO_COLORS[idx % PHOTO_COLORS.length]!,
            uploadedAt: formattedDate,
          };
        });

        setPhotos(mappedPhotos);

        if (mappedPhotos.length > 0) {
          const randomIndex = Math.floor(Math.random() * mappedPhotos.length);
          setHeroPhoto(mappedPhotos[randomIndex]);
        }
      }
    } catch (e) {
      console.log("사진 로딩 실패:", e);
    }
  }, [folderId]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  useEffect(() => {
    if (route.params?.refresh) {
      void loadPhotos();

      if (route.params?.toast) {
        const { icon, message } = route.params.toast;
        triggerToast(icon, message);

        navigation.setParams({
          refresh: undefined,
          toast: undefined,
        });
      }
    }
  }, [route.params?.refresh, route.params?.toast, loadPhotos, navigation, triggerToast]);

  const handleAddPhotos = async () => {
    const pickedAssets = await handleMultipleImagePick();
    if (!pickedAssets || pickedAssets.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // photos INSERT에는 member_id/family_id가 없음. 스토리지 경로용으로 family_id만 조회합니다.
      const { data: memberRow } = await supabase
        .from("members")
        .select("family_id")
        .eq("auth_uid", user.id)
        .single();

      if (!memberRow) return;

      const familyId = memberRow.family_id;
      const batchId = Date.now();

      const results = await Promise.all(
        pickedAssets.map(async (pick, index) => {
          try {
            const iso = galleryLabelToOriginalDateIso(pick.date);
            const originalDate = iso ? Date.parse(iso) : Date.now();

            const compressedUri = await compressImage(pick.uri);
            const file = new File(compressedUri);
            const base64 = await file.base64();
            if (!base64) {
              console.log("앨범 이미지 읽기 실패:", index);
              return null;
            }
            const buffer = decode(base64);
            const storagePath = `${familyId}/${folderId}/${batchId}_${index}.jpg`;
            const { error: upErr } = await supabase.storage.from("albums").upload(storagePath, buffer, {
              contentType: "image/jpeg",
              upsert: false,
            });
            if (upErr) {
              console.log("앨범 스토리지 업로드 실패:", upErr);
              return null;
            }
            const { data: urlData } = supabase.storage.from("albums").getPublicUrl(storagePath);
            return { publicUrl: urlData.publicUrl, originalDate };
          } catch (e) {
            console.log("개별 업로드 실패:", e);
            return null;
          }
        })
      );

      const validResults = results.filter((r): r is { publicUrl: string; originalDate: number } => r !== null);

      if (isMountedRef.current && validResults.length > 0) {
        try {
          const { error: insErr } = await supabase.from("photos").insert(
            validResults.map((r) => ({
              album_id: Number(folderId),
              image_url: r.publicUrl,
              // DB에 없는 member_id, family_id는 제외하고 created_at은 ISO String으로 변환
              created_at: r.originalDate ? new Date(r.originalDate).toISOString() : new Date().toISOString(),
            }))
          );
          if (insErr) {
            console.log("photos INSERT 실패:", insErr);
          }
        } catch (insertErr) {
          console.log("photos INSERT 예외:", insertErr);
        }
      }

      try {
        const { data: myMemberData } = await supabase
          .from("members")
          .select("id")
          .eq("auth_uid", user.id)
          .single();

        if (myMemberData) {
          await supabase.rpc("fn_notif_album_upload", {
            p_album_id: Number(folderId),
            p_uploader_id: myMemberData.id,
          });
        }
      } catch (notifErr) {
        console.log("앨범 알림 발송 실패:", notifErr);
      }

      await loadPhotos();

      triggerToast("✅", `${pickedAssets.length}장의 사진이 추가되었어요`);
    } catch (e) {
      console.log("사진 추가 예외:", e);
    }
  };

  const toAlbumDetailParams = useCallback(
    (photo: Photo) => ({
      photoId: photo.id,
      imageUri: photo.imageUri,
      uploadedAt: photo.uploadedAt,
      folderId,
      folderName,
      folderCount,
      folderMaxCount,
      folderCoverColor,
      onDeleteSuccess: () => {
        void loadPhotos();
        triggerToast("🗑️", "사진이 삭제되었습니다");
      },
    }),
    [folderId, folderName, folderCount, folderMaxCount, folderCoverColor, loadPhotos, triggerToast]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.6}>
          <ChevronLeftIcon size={32} color={Colors.textSub} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{folderName}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
      >
        <TouchableOpacity
          style={[styles.hero, { backgroundColor: heroPhoto?.color || folderCoverColor }]}
          activeOpacity={0.9}
          onPress={() => {
            if (heroPhoto) {
              navigation.navigate("AlbumDetail", toAlbumDetailParams(heroPhoto));
            }
          }}
        >
          {heroPhoto?.imageUri && (
            <Image
              source={{ uri: heroPhoto.imageUri }}
              style={styles.heroImage}
              contentFit="cover"
              transition={200}
            />
          )}
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{folderName}</Text>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                {photos.length}/{folderMaxCount}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {photos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>가족과 함께한 추억을 등록해보세요</Text>
          </View>
        ) : (
          <PhotoGrid
            photos={photos}
            onPhotoPress={(p) => navigation.navigate("AlbumDetail", toAlbumDetailParams(p))}
          />
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={handleAddPhotos} activeOpacity={0.85}>
        <Text style={styles.fabText}>+ 사진 추가</Text>
      </TouchableOpacity>

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
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "NanumSquareRound-Bold",
    color: Colors.text,
    textAlign: "center",
  },
  hero: { width: "100%", height: 220, position: "relative" },
  heroImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  heroContent: {
    position: "absolute",
    bottom: 16,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroTitle: {
    fontSize: 18,
    fontFamily: "NanumSquareRound-Bold",
    color: Colors.white,
  },
  heroBadge: { backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 10, paddingVertical: 3, paddingHorizontal: 10 },
  heroBadgeText: { fontSize: 13, fontFamily: "Pretendard-Regular", color: Colors.white },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 150,
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: "NanumSquareRound-Regular",
    color: Colors.textHint,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    bottom: 40,
    right: 24,
    backgroundColor: Colors.accent,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: "#5A3E1B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: { fontSize: 14, fontFamily: "Pretendard-Medium", color: Colors.white },
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
