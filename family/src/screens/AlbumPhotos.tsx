import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Animated,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import CheckCircleIcon from "../components/CheckCircleIcon";
import Svg, { Path } from "react-native-svg";
import { Colors } from "../constants/colors";
import type { MainTabStackParamList } from "../navigation/types";
import { handleMultipleImagePick } from "../utils/imagePicker";

type Props = NativeStackScreenProps<MainTabStackParamList, "AlbumPhotos">;

// ─── Photo model & palette ─────────────────────────────────────────────────────

type Photo = {
  id: number;
  imageUri?: string;
  color: string;
  uploadedAt: string;
};

const PHOTO_COLORS = ["#D4B896", "#C9A882", "#E8C9A0", "#B89878", "#DDBF9A", "#C4A87E", "#E0C8A8", "#BFA080", "#D8BC94"];

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
              {ph.imageUri && <Image source={{ uri: ph.imageUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />}
            </TouchableOpacity>
          ))}
        </View>
      );
      i += 3;
    } else if (pat === 2 && i + 2 < photos.length) {
      const big = photos[i];
      const sm1 = photos[i + 1];
      const sm2 = photos[i + 2];
      const bigSize = GRID_COL3 * 2 + GRID_GAP;
      rows.push(
        <View key={`r${i}`} style={{ flexDirection: "row", gap: GRID_GAP, marginBottom: GRID_GAP }}>
          <TouchableOpacity onPress={() => onPhotoPress(big)} activeOpacity={0.9}
            style={{ width: bigSize, height: bigSize, borderRadius: 4, backgroundColor: big.color, overflow: "hidden" }}>
            {big.imageUri && <Image source={{ uri: big.imageUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />}
          </TouchableOpacity>
          <View style={{ gap: GRID_GAP }}>
            <TouchableOpacity onPress={() => onPhotoPress(sm1)} activeOpacity={0.9}
              style={{ width: GRID_COL3, height: GRID_COL3, borderRadius: 4, backgroundColor: sm1.color, overflow: "hidden" }}>
              {sm1.imageUri && <Image source={{ uri: sm1.imageUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onPhotoPress(sm2)} activeOpacity={0.9}
              style={{ width: GRID_COL3, height: GRID_COL3, borderRadius: 4, backgroundColor: sm2.color, overflow: "hidden" }}>
              {sm2.imageUri && <Image source={{ uri: sm2.imageUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />}
            </TouchableOpacity>
          </View>
        </View>
      );
      i += 3;
    } else if (pat === 3 && i < photos.length) {
      const ph = photos[i];
      rows.push(
        <TouchableOpacity key={`r${i}`} onPress={() => onPhotoPress(ph)} activeOpacity={0.9}
          style={{ width: "100%", height: 220, borderRadius: 4, backgroundColor: ph.color, marginBottom: GRID_GAP, overflow: "hidden" }}>
          {ph.imageUri && <Image source={{ uri: ph.imageUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />}
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
              {ph.imageUri && <Image source={{ uri: ph.imageUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />}
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

  const handleAddPhotos = async () => {
    const pickedAssets = await handleMultipleImagePick();
    if (pickedAssets && pickedAssets.length > 0) {
      const newPhotos: Photo[] = pickedAssets.map((asset, index) => ({
        id: Date.now() + index,
        imageUri: asset.uri,
        color: PHOTO_COLORS[Math.floor(Math.random() * PHOTO_COLORS.length)]!,
        uploadedAt: asset.date,
      }));

      setPhotos((prev) => {
        const updated = [...prev, ...newPhotos];
        setHeroPhoto((currentHero) => currentHero || updated[0]);
        return updated;
      });

      triggerToast("✅", `${pickedAssets.length}장의 사진이 추가되었어요`);
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
    }),
    [folderId, folderName, folderCount, folderMaxCount, folderCoverColor]
  );

  useEffect(() => {
    if (!route.params?.showDeleteToast) return;
    triggerToast("🗑️", "사진이 삭제되었습니다");
    navigation.setParams({ showDeleteToast: undefined });
  }, [route.params?.showDeleteToast, navigation, triggerToast]);

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
            <Image source={{ uri: heroPhoto.imageUri }} style={styles.heroImage} resizeMode="cover" />
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
