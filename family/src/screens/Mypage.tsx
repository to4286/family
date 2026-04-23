import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Animated,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { MainTabParamList, MainTabStackParamList } from "../navigation/types";
import Svg, { Path } from "react-native-svg";
import { Colors } from "../constants/colors";
import { TOAST_ANIM_MS, TOAST_CONTAINER_BOTTOM, TOAST_DISPLAY_MS, TOAST_SLIDE_OFFSCREEN_PX } from "../constants/toastUI";

// HomeScreen.tsx의 스타일 상수를 그대로 적용하여 일관성 유지
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

const BOTTOM_SHEET_SLIDE_OFFSET = 300;
const BOTTOM_SHEET_OPEN_MS = 250;
const BOTTOM_SHEET_CLOSE_MS = 200;

function ProfileMenuModal({
  visible,
  onClose,
  onChangePhoto,
  onChangeNickname,
}: {
  visible: boolean;
  onClose: () => void;
  onChangePhoto: () => void;
  onChangeNickname: () => void;
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(BOTTOM_SHEET_SLIDE_OFFSET)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(BOTTOM_SHEET_SLIDE_OFFSET);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: BOTTOM_SHEET_OPEN_MS,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: BOTTOM_SHEET_SLIDE_OFFSET,
      duration: BOTTOM_SHEET_CLOSE_MS,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.bottomSheetOverlay} activeOpacity={1} onPress={handleClose}>
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              paddingBottom: Math.max(insets.bottom, 20),
              transform: [{ translateY: slideAnim }],
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.bottomSheetHandle} />
          <TouchableOpacity style={styles.bottomSheetItem} onPress={onChangePhoto} activeOpacity={0.7}>
            <Text style={styles.bottomSheetItemText}>프로필 사진 변경</Text>
          </TouchableOpacity>
          <View style={styles.bottomSheetDivider} />
          <TouchableOpacity style={styles.bottomSheetItem} onPress={onChangeNickname} activeOpacity={0.7}>
            <Text style={styles.bottomSheetItemText}>닉네임 변경</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function MypageScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<MainTabParamList, "MyPage">>();
  const navigation = useNavigation<NativeStackNavigationProp<MainTabStackParamList>>();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [toastContent, setToastContent] = useState({ icon: "", text: "" });
  const toastAnim = useRef(new Animated.Value(TOAST_SLIDE_OFFSCREEN_PX)).current;

  const [profilePhotoUri, setProfilePhotoUri] = useState("https://i.pravatar.cc/150?img=33");

  useEffect(() => {
    if (route.params?.profileImageUri) {
      setProfilePhotoUri(route.params.profileImageUri);
      navigation.setParams({ profileImageUri: undefined } as never);
    }
  }, [route.params?.profileImageUri, navigation]);

  useEffect(() => {
    const text = route.params?.toastText;
    if (!text) return;

    setToastContent({ icon: route.params?.toastIcon ?? "✅", text });
    setShowToast(true);
    Animated.timing(toastAnim, { toValue: 0, duration: TOAST_ANIM_MS, useNativeDriver: true }).start();

    const t = setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: TOAST_SLIDE_OFFSCREEN_PX,
        duration: TOAST_ANIM_MS,
        useNativeDriver: true,
      }).start(() => {
        setShowToast(false);
        navigation.setParams({ toastText: undefined, toastIcon: undefined } as never);
      });
    }, TOAST_DISPLAY_MS);

    return () => clearTimeout(t);
    // 토스트 트리거는 toastText만 구독 — 조기 setParams로 타이머가 끊기지 않게 위에서 처리
    // eslint-disable-next-line react-hooks/exhaustive-deps -- params 초기화는 퇴장 애니 끝에서만
  }, [route.params?.toastText]);

  const handleCopyCode = () => {
    Alert.alert("알림", "초대 코드가 복사되었습니다!");
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* --- 헤더: HomeScreen과 동일한 구조 및 스타일 --- */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => (navigation as { navigate: (n: "Settings") => void }).navigate("Settings")}
          activeOpacity={0.85}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.21.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
              fill={Colors.accent}
            />
          </Svg>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* --- 첫 번째 레이아웃: 내 정보 --- */}
        <View style={[styles.card, styles.sectionCard]}>
          <Text style={styles.sectionTitle}>내 정보</Text>
          <View style={styles.profileRow}>
            <Image source={{ uri: profilePhotoUri }} style={styles.profileImageRow} resizeMode="cover" />
            <View style={styles.profileInfo}>
              <Text style={styles.nicknameText}>민준</Text>
              <View style={styles.typeBadgeRow}>
                <Text style={styles.typeTextRow}>든든한 버팀목</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.editProfileBtn}
              activeOpacity={0.8}
              onPress={() => setShowProfileMenu(true)}
            >
              <Text style={styles.editProfileBtnText}>수정</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- 두 번째 레이아웃: 가족 관리 --- */}
        <View style={[styles.card, styles.sectionCard]}>
          <Text style={styles.sectionTitle}>가족 관리</Text>
          <View style={styles.listItem}>
            <Text style={styles.listLabel}>초대 코드</Text>
            <View style={styles.listValueRow}>
              <Text style={styles.inlineCodeText}>ABC-1234</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
                <Text style={styles.copyBtnText}>복사</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.listItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("FamilyTypeEdit")}
          >
            <Text style={styles.listLabel}>가족 유형 변경</Text>
            <View style={styles.listValueRow}>
              <Text style={styles.listValue}>대화가 많은 우리 가족 🏡</Text>
              <Text style={styles.arrow}>{">"}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* --- 세 번째 레이아웃: 기타 --- */}
        <View style={[styles.card, styles.sectionCard]}>
          <Text style={styles.sectionTitle}>기타</Text>
          <TouchableOpacity style={styles.listItem} activeOpacity={0.7}>
            <Text style={styles.listLabel}>문의하기</Text>
            <Text style={styles.arrow}>{">"}</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.listItem} activeOpacity={0.7}>
            <Text style={styles.listLabel}>서비스 이용약관 동의</Text>
            <Text style={styles.arrow}>{">"}</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.listItem} activeOpacity={0.7}>
            <Text style={styles.listLabel}>개인정보 처리방침</Text>
            <Text style={styles.arrow}>{">"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ProfileMenuModal
        visible={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        onChangePhoto={() => {
          setShowProfileMenu(false);
          navigation.navigate("ProfilePhotoEdit");
        }}
        onChangeNickname={() => {
          setShowProfileMenu(false);
          navigation.navigate("NicknameEdit");
        }}
      />

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
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "NanumSquareRound-ExtraBold",
    color: Colors.text,
  },
  settingsBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.82)",
    alignItems: "center",
    justifyContent: "center",
    ...headerControlShadow,
  },
  scrollContent: {
    padding: 24,
    gap: 16,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    ...CARD_SURFACE_SHADOW,
  },
  // HomeScreen의 오늘의 추억 카드 스타일과 일치
  sectionCard: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
  },
  // HomeScreen의 todayTitle 스타일과 일치
  sectionTitle: {
    fontSize: 17,
    fontFamily: "NanumSquareRound-ExtraBold",
    color: Colors.text,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12, // listItem과 동일한 여백 추가 (타이틀과의 간격 동일화)
  },
  profileImageRow: {
    width: 56, // 64에서 56으로 축소
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surface,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },
  nicknameText: {
    fontSize: 16, // 18에서 16으로 축소
    fontFamily: "NanumSquareRound-Bold",
    color: Colors.text,
    marginBottom: 4, // 6에서 4로 축소
  },
  typeBadgeRow: {
    alignSelf: "flex-start",
    backgroundColor: Colors.surface,
    paddingHorizontal: 8, // 10에서 8로 축소
    paddingVertical: 3, // 4에서 3로 축소
    borderRadius: 6,
  },
  typeTextRow: {
    fontSize: 11, // 12에서 11로 축소
    fontFamily: "Pretendard-Medium",
    color: Colors.textSub,
  },
  editProfileBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.white, // 배경을 연하게 (하얀색)
    borderWidth: 1,
    borderColor: Colors.accent, // 테두리를 강조 컬러로
  },
  editProfileBtnText: {
    fontSize: 13,
    fontFamily: "Pretendard-Medium",
    color: Colors.accent, // 텍스트를 강조 컬러로
  },
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
  bottomSheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginHorizontal: 24,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  listLabel: {
    fontSize: 15,
    fontFamily: "NanumSquareRound-Bold",
    color: Colors.text,
  },
  listValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineCodeText: {
    fontSize: 15,
    fontFamily: "Pretendard-Medium",
    color: Colors.textSub,
    letterSpacing: 0.5,
  },
  copyBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 12,
    fontFamily: "Pretendard-Bold",
    color: Colors.white,
  },
  listValue: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.textSub,
  },
  arrow: {
    fontSize: 16,
    color: Colors.textHint,
    fontFamily: "Pretendard-Regular",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    opacity: 0.5,
  },
  toastContainer: {
    position: "absolute",
    bottom: TOAST_CONTAINER_BOTTOM,
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
  toastIcon: { fontSize: 20 },
  toastText: { fontSize: 16, fontFamily: "Pretendard-Medium", color: "#FFFFFF" },
});
