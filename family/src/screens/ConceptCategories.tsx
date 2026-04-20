import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";
import { Colors } from "../constants/colors";
import type { MainTabStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<MainTabStackParamList, "ConceptCategories">;

// ─── Data ──────────────────────────────────────────────────────────────────────

type Category = {
  id: number;
  level: number;
  name: string;
  emoji: string;
  iconBg: string;
  answeredCount: number;
  totalCount: number;
  unlocked: boolean;
};

const CATEGORIES: Category[] = [
  { id: 1, level: 1, name: "일상", emoji: "☀️", iconBg: "#FFF3E8", answeredCount: 3, totalCount: 10, unlocked: true },
  { id: 2, level: 2, name: "취향", emoji: "🎵", iconBg: "#FEF0E6", answeredCount: 0, totalCount: 10, unlocked: false },
  { id: 3, level: 3, name: "추억", emoji: "📷", iconBg: "#FAE8D5", answeredCount: 0, totalCount: 10, unlocked: false },
  { id: 4, level: 4, name: "생각", emoji: "💭", iconBg: "#F0D9C4", answeredCount: 0, totalCount: 10, unlocked: false },
  { id: 5, level: 5, name: "마음", emoji: "💛", iconBg: "#E8C9A0", answeredCount: 0, totalCount: 10, unlocked: false },
];

const CAT_ICON_LOCKED_BG = "#EBE6E1";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function ChevronLeftIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** 받침 여부에 따라 '은' / '는' 반환 */
function getTopicParticle(name: string): string {
  if (!name) return "은";
  const code = name.charCodeAt(name.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return "은";
  return (code - 0xac00) % 28 === 0 ? "는" : "은";
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function ConceptCategoriesScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainTabStackParamList>>();
  const { memberId, memberNickname } = route.params;

  const headerTitle = `${memberNickname}${getTopicParticle(memberNickname)} 어떤 사람일까요?`;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.6}>
          <ChevronLeftIcon size={32} color={Colors.textSub} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.catCard, !cat.unlocked && styles.catCardLocked]}
            activeOpacity={cat.unlocked ? 0.85 : 1}
            onPress={() => {
              if (!cat.unlocked) return;
              navigation.navigate("ConceptQuestions", {
                memberId,
                memberNickname,
                categoryId: cat.id,
                categoryName: cat.name,
                categoryEmoji: cat.emoji,
              });
            }}
          >
            <View
              style={[
                styles.catIconWrap,
                { backgroundColor: cat.unlocked ? cat.iconBg : CAT_ICON_LOCKED_BG },
              ]}
            >
              <Text style={styles.catIconEmoji}>{cat.unlocked ? cat.emoji : "🔒"}</Text>
            </View>

            <View style={styles.catInfo}>
              <View style={styles.catLevelRow}>
                <Text style={[styles.catLevel, !cat.unlocked && { color: Colors.textHint }]}>
                  Chapter {cat.level}
                </Text>
                <Text style={[styles.catName, !cat.unlocked && { color: Colors.textHint }]}>{cat.name}</Text>
              </View>
              {!cat.unlocked && (
                <Text style={styles.catLockHint}>
                  Chapter {cat.level - 1}을 모두 답변하면 열려요
                </Text>
              )}
            </View>

            <View style={styles.catRight}>
              {cat.unlocked && (
                <Text style={styles.catProgress}>{cat.answeredCount}/{cat.totalCount}</Text>
              )}
              <Text style={styles.catChevron}>›</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg,
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
  listContent: {
    padding: 24,
    paddingTop: 20,
    gap: 18,
    paddingBottom: 40,
  },
  catCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    shadowColor: "#8B6914",
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
    elevation: 3,
  },
  catCardLocked: {
    opacity: 0.5,
    backgroundColor: Colors.white,
  },
  catIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  catIconEmoji: {
    fontSize: 22,
  },
  catInfo: {
    flex: 1,
  },
  catLevelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  catLevel: {
    fontSize: 12,
    fontFamily: "Pretendard-Medium",
    color: Colors.accent,
  },
  catName: {
    fontSize: 18,
    fontFamily: "NanumSquareRound-ExtraBold",
    color: Colors.text,
  },
  catLockHint: {
    fontSize: 12,
    fontFamily: "Pretendard-Regular",
    color: Colors.textHint,
    marginTop: 4,
  },
  catRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  catProgress: {
    fontSize: 13,
    fontFamily: "Pretendard-Regular",
    color: Colors.textSub,
  },
  catChevron: {
    fontSize: 20,
    color: Colors.textHint,
    lineHeight: 22,
  },
});
