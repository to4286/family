import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StyleSheet,
  Alert,
  Linking,
  Animated,
  Modal,
  ScrollView,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import Svg, { Path } from "react-native-svg";
import { Colors } from "../constants/colors";
import { useStoryImagePicker } from "../hooks/useStoryImagePicker";
import { supabase } from "../utils/supabase";
import { File } from "expo-file-system/next";
import { decode } from "base64-arraybuffer";
import { compressImage } from "../utils/imageCompress";

WebBrowser.maybeCompleteAuthSession();

function getAuthCallbackParams(input: string) {
  const url = new URL(input, "https://phony.example");
  const errorCode = url.searchParams.get("errorCode");
  if (errorCode) url.searchParams.delete("errorCode");
  const params: Record<string, string> = Object.fromEntries(
    url.searchParams as unknown as Iterable<[string, string]>
  );
  if (url.hash) {
    new URLSearchParams(url.hash.replace(/^#/, "")).forEach((value, key) => {
      params[key] = value;
    });
  }
  return { errorCode, params };
}

// --- 상수 및 데이터 ---
const ROLES = [
  { emoji: "👨", title: "든든한 버팀목", sub: "아빠" },
  { emoji: "👩", title: "따뜻한 햇살", sub: "엄마" },
  { emoji: "🧒", title: "사랑스러운 복덩이", sub: "자녀" },
];

const FAMILY_TYPES = [
  "웃음이 가득한 가족",
  "서로 존중하는 가족",
  "배려가 많은 가족",
  "기타 (직접 입력)",
];

const AGREEMENT_ITEMS = [
  { key: "terms" as const, label: "서비스 이용약관 동의", req: true, url: "https://www.notion.so/34ff9aeb2c4780e4bac3cdbbc8e7d777" },
  { key: "privacy" as const, label: "개인정보 수집 동의", req: true, url: "https://www.notion.so/34ff9aeb2c4780249717cfbe6ff7480a" },
  { key: "marketing" as const, label: "마케팅 수신 동의", req: false, url: null },
];

const CODE_LENGTH = 6;
const MAX_NICKNAME = 6;
const ERROR_COLOR = "#D4645A"; // 설정 화면과 통일된 에러 컬러

const INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(): string {
  let result = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    result += INVITE_CODE_CHARS.charAt(Math.floor(Math.random() * INVITE_CODE_CHARS.length));
  }
  return result;
}

const CARD_SURFACE_SHADOW = {
  shadowColor: "#8B6914",
  shadowOffset: { width: 1, height: 3 },
  shadowOpacity: 0.15,
  shadowRadius: 1.5,
  elevation: 3,
};

const BOTTOM_SHEET_SLIDE_OFFSET = 300;
const BOTTOM_SHEET_OPEN_MS = 250;
const BOTTOM_SHEET_CLOSE_MS = 200;

// --- 공용 컴포넌트 ---
function ChevronLeftIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function StepIndicator({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.stepIndicator}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.stepDot, { width: i === current ? 20 : 6, backgroundColor: i === current ? Colors.accent : Colors.border }]} />
      ))}
    </View>
  );
}

function BtnPrimary({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity onPress={disabled ? undefined : onPress} activeOpacity={disabled ? 1 : 0.8} style={[styles.btnPrimary, { backgroundColor: disabled ? Colors.border : Colors.accent }]}>
      <Text style={styles.btnPrimaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

function BtnGhost({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.btnGhost}>
      <Text style={styles.btnGhostText}>{label}</Text>
    </TouchableOpacity>
  );
}

function Checkbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity onPress={onToggle} style={[styles.checkbox, { borderColor: checked ? Colors.accent : Colors.border, backgroundColor: checked ? Colors.accent : Colors.white }]}>
      {checked && <View style={styles.checkmark} />}
    </TouchableOpacity>
  );
}

function PhotoSelectionModal({ visible, onClose, onSelectAlbum, onTakePhoto }: any) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(BOTTOM_SHEET_SLIDE_OFFSET)).current;
  React.useEffect(() => {
    if (visible) {
      slideAnim.setValue(BOTTOM_SHEET_SLIDE_OFFSET);
      Animated.timing(slideAnim, { toValue: 0, duration: BOTTOM_SHEET_OPEN_MS, useNativeDriver: true }).start();
    }
  }, [visible, slideAnim]);
  const handleClose = () => {
    Animated.timing(slideAnim, { toValue: BOTTOM_SHEET_SLIDE_OFFSET, duration: BOTTOM_SHEET_CLOSE_MS, useNativeDriver: true }).start(() => onClose());
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.bottomSheetOverlay} activeOpacity={1} onPress={handleClose}>
        <Animated.View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 12, transform: [{ translateY: slideAnim }] }]} onStartShouldSetResponder={() => true}>
          <View style={styles.bottomSheetHandle} />
          <TouchableOpacity style={styles.bottomSheetItem} onPress={onSelectAlbum} activeOpacity={0.7}>
            <Text style={styles.bottomSheetItemText}>사진에서 선택</Text>
          </TouchableOpacity>
          <View style={styles.bottomSheetDivider} />
          <TouchableOpacity style={styles.bottomSheetItem} onPress={onTakePhoto} activeOpacity={0.7}>
            <Text style={styles.bottomSheetItemText}>직접 찍기</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// --- 개별 화면 스크린 ---

function LoginScreen({ onNext, onExistingMember }: { onNext: () => void; onExistingMember: () => void }) {
  const handleGoogleLogin = async () => {
    const redirectTo = makeRedirectUri();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) {
      Alert.alert("로그인 실패", error.message);
      return;
    }
    if (!data.url) {
      Alert.alert("로그인 실패", "인증 주소를 가져올 수 없습니다.");
      return;
    }
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type === "success") {
      const { params, errorCode } = getAuthCallbackParams(res.url);
      if (errorCode) {
        Alert.alert("로그인 실패", errorCode);
        return;
      }
      if (params.error) {
        Alert.alert("로그인 실패", params.error_description || params.error);
        return;
      }
      if (params.code) {
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(params.code);
        if (sessionError) {
          Alert.alert("로그인 실패", sessionError.message);
          return;
        }
      } else {
        const access_token = params.access_token;
        const refresh_token = params.refresh_token;
        if (!access_token || !refresh_token) {
          Alert.alert("로그인 실패", "세션 정보를 응답에서 찾을 수 없습니다.");
          return;
        }
        const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
        if (sessionError) {
          Alert.alert("로그인 실패", sessionError.message);
          return;
        }
      }
      // 이미 가입된 회원인지 확인
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: member } = await supabase
          .from("members")
          .select("id")
          .eq("auth_uid", user.id)
          .single();

        if (member) {
          onExistingMember();
          return;
        }
      }
      onNext();
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: 32 }]}>
      <View style={styles.loginHero}>
        <View style={styles.loginAccentBar} />
        <Text style={styles.loginTitle}>{"가까운듯\n먼 사이"}</Text>
        <Text style={styles.loginSubtitle}>가족과 더 가까워지는 따뜻한 공간</Text>
        <View style={styles.socialBtns}>
          <TouchableOpacity onPress={handleGoogleLogin} activeOpacity={0.8} style={styles.googleBtn}>
            <View style={styles.logoPlaceholder} />
            <Text style={styles.googleBtnText}>구글로 로그인</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onNext} activeOpacity={0.8} style={styles.appleBtn}>
            <View style={styles.appleLogoPlaceholder} />
            <Text style={styles.appleBtnText}>Apple로 로그인</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.loginDisclaimer}>로그인 시 이용약관에 동의하게 됩니다</Text>
    </View>
  );
}

function AgreementScreen({ onNext, checks, setChecks }: any) {
  const allChecked = checks.terms && checks.privacy && checks.marketing;
  const toggle = (key: any) => setChecks((prev: any) => ({ ...prev, [key]: !prev[key] }));
  const toggleAll = () => {
    const next = !allChecked;
    setChecks({ terms: next, privacy: next, marketing: next });
  };
  const canNext = checks.terms && checks.privacy;
  return (
    <View style={[styles.screen, styles.screenTopAgreement]}>
      <Text style={[styles.screenTitle, { marginBottom: 40 }]}>{"서비스 이용을 위한\n동의가 필요해요"}</Text>
      <TouchableOpacity onPress={toggleAll} style={styles.allCheckRow}>
        <Checkbox checked={allChecked} onToggle={toggleAll} />
        <Text style={styles.allCheckLabel}>전체 동의</Text>
      </TouchableOpacity>
      <View style={styles.divider} />
      {AGREEMENT_ITEMS.map(({ key, label, req, url }) => (
        <View key={key} style={styles.agreementRow}>
          <TouchableOpacity onPress={() => toggle(key)} style={styles.agreementToggleArea} activeOpacity={0.8}>
            <Checkbox checked={checks[key]} onToggle={() => toggle(key)} />
            <View style={styles.agreementTextRow}>
              <Text style={styles.agreementLabel}>{label}</Text>
              <Text style={styles.agreementTag}>({req ? "필수" : "선택"})</Text>
            </View>
          </TouchableOpacity>
          {url && (
            <TouchableOpacity style={styles.agreementLinkBtn} onPress={() => Linking.openURL(url)} activeOpacity={0.6}>
              <Text style={styles.agreementArrow}>{">"}</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <View style={{ flex: 1 }} />
      <BtnPrimary label="다음" onPress={onNext} disabled={!canNext} />
    </View>
  );
}

function InviteCodeScreen({ onNext, onSkip, code, setCode }: any) {
  const inputRef = useRef<TextInput>(null);
  const [error, setError] = useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleNext = async () => {
    const { data, error } = await supabase
      .from("families")
      .select("id")
      .eq("invite_code", code)
      .single();

    if (error || !data) {
      setError(true);
    } else {
      onNext(true);
    }
  };
  const handleTextChange = (text: string) => {
    if (error) setError(false);
    setCode(text.slice(0, CODE_LENGTH).toUpperCase());
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.screen}>
        <StepIndicator total={5} current={0} />
        <Text style={styles.screenTitle}>{"가족 코드가\n있으신가요?"}</Text>
        <Text style={[styles.screenSubtitle, { marginBottom: 40 }]}>가족에게 받은 코드를 입력해 주세요</Text>
        <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()} style={styles.codeBoxRow}>
          {Array.from({ length: CODE_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.codeBox,
                {
                  borderColor: error ? ERROR_COLOR : code[i] ? Colors.accent : Colors.border,
                  backgroundColor: code[i] && !error ? Colors.accentLight : Colors.bg,
                },
              ]}
            >
              <Text style={styles.codeChar}>{code[i] ?? ""}</Text>
            </View>
          ))}
        </TouchableOpacity>
        {error && <Text style={styles.errorText}>존재하지 않는 코드입니다. 다시 입력해주세요</Text>}
        <TextInput ref={inputRef} value={code} onChangeText={handleTextChange} maxLength={CODE_LENGTH} style={styles.hiddenInput} autoCapitalize="characters" keyboardType="ascii-capable" />
        <View style={{ flex: 1 }} />
        <BtnPrimary label="다음" onPress={handleNext} disabled={code.length !== CODE_LENGTH} />
        <View style={{ height: 8 }} />
        <BtnGhost label="코드가 없어요" onPress={() => onSkip(false)} />
      </View>
    </KeyboardAvoidingView>
  );
}

function RoleSelectScreen({ onNext, selected, setSelected }: any) {
  return (
    <View style={styles.screen}>
      <StepIndicator total={5} current={1} />
      <Text style={styles.screenTitle}>{"나는 어떤\n가족인가요?"}</Text>
      <Text style={styles.screenSubtitle}>역할을 선택해 주세요</Text>
      <View style={styles.listGap12}>
        {ROLES.map((role, i) => {
          const isSelected = selected === i;
          return (
            <TouchableOpacity key={i} onPress={() => setSelected(i)} activeOpacity={0.8} style={[styles.roleCard, { borderColor: isSelected ? Colors.accent : Colors.border, borderWidth: isSelected ? 2 : 1, backgroundColor: isSelected ? Colors.accentLight : Colors.white }]}>
              <View style={[styles.roleEmoji, { backgroundColor: isSelected ? "rgba(232,149,90,0.15)" : Colors.surface }]}>
                <Text style={styles.roleEmojiText}>{role.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleTitle}>{role.title}</Text>
                <Text style={styles.roleSub}>{role.sub}</Text>
              </View>
              <View style={[styles.radioBtn, { borderColor: isSelected ? Colors.accent : Colors.border, backgroundColor: isSelected ? Colors.accent : Colors.white }]} />
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ height: 32 }} />
      <BtnPrimary label="다음" onPress={onNext} disabled={selected === null} />
    </View>
  );
}

function NicknameScreen({ onNext, nickname, setNickname }: any) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.screen}>
        <StepIndicator total={5} current={2} />
        <Text style={[styles.screenTitle, { marginBottom: 40 }]}>어떻게 불러드릴까요?</Text>
        <View>
          <TextInput
            value={nickname}
            onChangeText={(text) => setNickname(text.slice(0, MAX_NICKNAME))}
            placeholder="닉네임 입력"
            placeholderTextColor={Colors.textHint}
            style={[styles.textInput, { borderColor: nickname ? Colors.accent : Colors.border }]}
            autoFocus
          />
          <Text style={styles.inputCounter}>
            {nickname.length}/{MAX_NICKNAME}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <BtnPrimary label="다음" onPress={onNext} disabled={nickname.trim().length === 0} />
      </View>
    </KeyboardAvoidingView>
  );
}

function ProfilePhotoScreen({ onNext, profileImage, showPhotoModal, setShowPhotoModal, onSelectAlbum, onTakePhoto }: any) {
  const hasPhoto = profileImage != null;
  return (
    <View style={styles.screen}>
      <StepIndicator total={5} current={3} />
      <Text style={styles.screenTitle}>{"프로필 사진을\n설정해주세요"}</Text>
      <Text style={[styles.screenSubtitle, { marginBottom: 48 }]}>가족들에게 보여질 사진이에요</Text>
      <View style={styles.photoSection}>
        <TouchableOpacity onPress={() => setShowPhotoModal(true)} activeOpacity={0.8}>
          <View
            style={[
              styles.photoCircle,
              { backgroundColor: hasPhoto ? Colors.surface : Colors.bg, borderColor: hasPhoto ? Colors.accent : Colors.border, overflow: "hidden" },
            ]}
          >
            {hasPhoto && profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profilePickImage} resizeMode="cover" />
            ) : (
              <Text style={styles.photoPlusIcon}>+</Text>
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.photoHint}>터치해서 사진 선택</Text>
      </View>
      <BtnPrimary label="다음" onPress={onNext} disabled={!hasPhoto} />
      <View style={{ height: 8 }} />
      <BtnGhost label="나중에 설정할게요" onPress={onNext} />
      <PhotoSelectionModal visible={showPhotoModal} onClose={() => setShowPhotoModal(false)} onSelectAlbum={onSelectAlbum} onTakePhoto={onTakePhoto} />
    </View>
  );
}

function FamilyTypeScreen({ onNext, selected, setSelected, customText, setCustomText }: any) {
  const scrollRef = useRef<ScrollView>(null);
  const lastIndex = FAMILY_TYPES.length - 1;
  const isCustomSelected = selected === lastIndex;
  const canNext = selected !== null && (isCustomSelected ? customText.trim().length > 0 : true);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={12}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1, backgroundColor: Colors.white }}>
          {/* 1. 플로팅 헤더: 제목 영역 (고정) */}
          <View style={styles.floatingHeader}>
            <StepIndicator total={5} current={4} />
            <Text style={styles.screenTitle}>{"우리 가족은 어떤\n가족이 되고 싶나요?"}</Text>
            <Text style={styles.screenSubtitle}>원하는 모습을 골라주세요</Text>
          </View>

          {/* 2. 스크롤 영역: 리스트가 헤더와 버튼 사이를 흐름 */}
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollListContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => isCustomSelected && scrollRef.current?.scrollToEnd({ animated: true })}
          >
            <View style={styles.listGap10}>
              {FAMILY_TYPES.map((type, i) => {
                const isSelected = selected === i;
                const isLast = i === lastIndex;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      setSelected(i);
                      Keyboard.dismiss(); // 다른 항목 선택 시 키보드 즉시 닫힘
                    }}
                    activeOpacity={0.8}
                    style={[
                      styles.familyTypeCard,
                      {
                        borderColor: isSelected ? Colors.accent : Colors.border,
                        borderWidth: isSelected ? 2 : 1,
                        backgroundColor: isSelected ? Colors.accentLight : Colors.white,
                      },
                    ]}
                  >
                    {isLast && isSelected ? (
                      <TextInput
                        value={customText}
                        onChangeText={setCustomText}
                        placeholder="직접 입력해주세요"
                        placeholderTextColor={Colors.textHint}
                        style={[styles.textInput, styles.familyTypeCustomInput]}
                        autoFocus
                      />
                    ) : (
                      <Text
                        style={[
                          styles.familyTypeText,
                          {
                            color: isLast && !customText ? Colors.textHint : Colors.text,
                            fontFamily: isSelected ? "Pretendard-Medium" : "Pretendard-Regular",
                          },
                        ]}
                      >
                        {isLast && customText ? customText : type}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* 3. 플로팅 푸터: 버튼 영역 (키패드 따라 올라옴) */}
          <View style={styles.bottomBtnArea}>
            <BtnPrimary label="시작하기" onPress={onNext} disabled={!canNext} />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function NotificationPermissionScreen({ finish }: { finish: () => void | Promise<void> }) {
  const insets = useSafeAreaInsets();

  const handleAllow = async () => {
    const { status } = await Notifications.requestPermissionsAsync();

    if (status === "granted") {
      finish();
    } else {
      Alert.alert(
        "알림 권한 안내",
        "알림을 허용하지 않으면 가족의 소식을 놓칠 수 있어요. 기기 설정에서 언제든지 알림을 켤 수 있습니다.",
        [
          { text: "나중에 하기", style: "cancel", onPress: () => finish() },
          {
            text: "설정으로 이동",
            onPress: () => {
              Linking.openSettings();
              finish();
            },
          },
        ]
      );
    }
  };

  const handleLater = () => finish();

  return (
    <Modal visible transparent animationType="fade">
      <View style={StyleSheet.absoluteFillObject}>
        <View style={[StyleSheet.absoluteFillObject, styles.notificationDim]} />
        <View style={[StyleSheet.absoluteFillObject, styles.notificationModalContent]} pointerEvents="box-none">
          <View style={[styles.notificationSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <Text style={styles.notificationTitle}>{"대화가 끊기지 않게\n가족의 소식을 알려드려요!"}</Text>
            <Text style={styles.notificationSubtitle}>
              알림 권한 <Text style={styles.notificationSubtitleEm}>허용</Text>시, 더 원활한 소통이 가능해요!
            </Text>

            <View style={styles.mockupStack}>
              <View style={[styles.notifCard, CARD_SURFACE_SHADOW]}>
                <View style={styles.notifEmojiWrap}>
                  <Text style={styles.notifEmojiText}>👨</Text>
                </View>
                <View style={styles.notifCardContent}>
                  <View style={styles.notifCardHeader}>
                    <Text style={styles.notifAppName}>가족</Text>
                    <Text style={styles.notifCardTime}>방금 전</Text>
                  </View>
                  <Text style={styles.notifCardBody}>아빠가 새로운 스토리를 올렸어요</Text>
                </View>
              </View>
              <View style={[styles.notifCard, CARD_SURFACE_SHADOW]}>
                <View style={styles.notifEmojiWrap}>
                  <Text style={styles.notifEmojiText}>👩</Text>
                </View>
                <View style={styles.notifCardContent}>
                  <View style={styles.notifCardHeader}>
                    <Text style={styles.notifAppName}>가족</Text>
                    <Text style={styles.notifCardTime}>10분 전</Text>
                  </View>
                  <Text style={styles.notifCardBody}>엄마가 내 사진에 댓글을 남겼어요</Text>
                </View>
              </View>
            </View>

            <BtnPrimary label="알림 허용하기" onPress={handleAllow} />
            <View style={{ height: 8 }} />
            <BtnGhost label="나중에 하기" onPress={handleLater} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// --- 메인 온보딩 컴포넌트 ---
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { pickFromLibrary, pickFromCamera } = useStoryImagePicker();
  const [step, setStep] = useState(0);
  const [isJoiningByCode, setIsJoiningByCode] = useState(false);

  const [checks, setChecks] = useState({ terms: false, privacy: false, marketing: false });
  const [code, setCode] = useState("");
  const [role, setRole] = useState<number | null>(null);
  const [nickname, setNickname] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [familyType, setFamilyType] = useState<number | null>(null);
  const [customFamilyType, setCustomFamilyType] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const next = (joining?: boolean) => {
    if (joining === true || joining === false) setIsJoiningByCode(joining);
    setStep((s) => Math.min(s + 1, 7));
  };
  const back = () => {
    setShowPhotoModal(false);
    setStep((s) => Math.max(s - 1, 0));
  };
  const finish = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert("오류", "로그인 정보를 찾을 수 없어요. 다시 로그인해주세요.");
        setIsSaving(false);
        return;
      }

      let familyId: number;

      if (isJoiningByCode && code) {
        const { data: family, error: familyError } = await supabase
          .from("families")
          .select("id")
          .eq("invite_code", code)
          .single();

        if (familyError || !family) {
          Alert.alert("오류", "가족 코드를 찾을 수 없어요.");
          setIsSaving(false);
          return;
        }
        familyId = family.id;
      } else {
        const familyTypeText =
          familyType !== null
            ? familyType === FAMILY_TYPES.length - 1
              ? customFamilyType
              : FAMILY_TYPES[familyType]
            : null;

        const inviteCode = generateInviteCode();

        const { data: newFamily, error: createError } = await supabase
          .from("families")
          .insert({ invite_code: inviteCode, family_type: familyTypeText })
          .select("id")
          .single();

        if (createError || !newFamily) {
          Alert.alert("오류", "가족 그룹 생성에 실패했어요. 다시 시도해주세요.");
          setIsSaving(false);
          return;
        }
        familyId = newFamily.id;
      }

      let profileImageUrl: string | null = null;

      if (profileImage) {
        const storagePath = `${user.id}/profile.jpg`;

        const compressedUri = await compressImage(profileImage);
        const file = new File(compressedUri);
        const base64 = await file.base64();

        const { error: uploadError } = await supabase.storage
          .from("profiles")
          .upload(storagePath, decode(base64), {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("profiles")
            .getPublicUrl(storagePath);
          profileImageUrl = urlData.publicUrl;
        }
      }

      const roleType = role !== null ? ROLES[role].sub : null;

      const { data: newMember, error: memberError } = await supabase
        .from("members")
        .insert({
          auth_uid: user.id,
          family_id: familyId,
          nickname: nickname.trim(),
          role_type: roleType,
          profile_image_url: profileImageUrl,
          terms_agreed: checks.terms,
          marketing_agreed: checks.marketing,
        })
        .select("id")
        .single();

      if (memberError || !newMember) {
        Alert.alert("오류", `회원 저장 실패: ${memberError?.message || "알 수 없는 오류"}\n코드: ${memberError?.code || "없음"}`);
        setIsSaving(false);
        return;
      }

      await supabase.from("member_settings").insert({
        member_id: newMember.id,
      });

      navigation.reset({ index: 0, routes: [{ name: "MainTab" as never }] });
    } catch (e: any) {
      Alert.alert("오류", `문제 발생: ${e?.message || JSON.stringify(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const renderScreen = () => {
    switch (step) {
      case 0:
        return <LoginScreen onNext={next} onExistingMember={() => navigation.reset({ index: 0, routes: [{ name: "MainTab" as never }] })} />;
      case 1:
        return <AgreementScreen onNext={next} checks={checks} setChecks={setChecks} />;
      case 2:
        return <InviteCodeScreen onNext={next} onSkip={next} code={code} setCode={setCode} />;
      case 3:
        return <RoleSelectScreen onNext={next} selected={role} setSelected={setRole} />;
      case 4:
        return <NicknameScreen onNext={next} nickname={nickname} setNickname={setNickname} />;
      case 5:
        return (
          <ProfilePhotoScreen
            onNext={next}
            profileImage={profileImage}
            showPhotoModal={showPhotoModal}
            setShowPhotoModal={setShowPhotoModal}
            onSelectAlbum={async () => {
              const uri = await pickFromLibrary();
              setShowPhotoModal(false);
              if (uri) setProfileImage(uri);
            }}
            onTakePhoto={async () => {
              const uri = await pickFromCamera();
              setShowPhotoModal(false);
              if (uri) setProfileImage(uri);
            }}
          />
        );
      case 6:
        if (isJoiningByCode) {
          return <NotificationPermissionScreen finish={finish} />;
        }
        return <FamilyTypeScreen onNext={next} selected={familyType} setSelected={setFamilyType} customText={customFamilyType} setCustomText={setCustomFamilyType} />;
      case 7:
        return <NotificationPermissionScreen finish={finish} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {step > 1 && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={back} activeOpacity={0.6}>
            <ChevronLeftIcon size={32} color={Colors.textSub} />
          </TouchableOpacity>
        </View>
      )}
      {renderScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  header: { paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center" },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  screen: { flex: 1, paddingHorizontal: 28, paddingBottom: 40 },
  screenTopAgreement: { paddingTop: 78 },
  screenTitle: { fontSize: 22, fontFamily: "Pretendard-Medium", color: Colors.text, lineHeight: 32, marginBottom: 8 },
  screenSubtitle: { fontSize: 14, fontFamily: "Pretendard-Regular", color: Colors.textSub, lineHeight: 22, marginBottom: 32 },
  stepIndicator: { flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 8, marginBottom: 32 },
  stepDot: { height: 6, borderRadius: 3 },
  btnPrimary: { paddingVertical: 16, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontSize: 16, fontFamily: "Pretendard-Medium", color: Colors.white },
  btnGhost: { paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  btnGhostText: { fontSize: 14, fontFamily: "Pretendard-Regular", color: Colors.textHint },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  checkmark: { width: 5, height: 9, borderRightWidth: 2, borderBottomWidth: 2, borderColor: Colors.white, transform: [{ rotate: "45deg" }], marginTop: -2 },
  loginHero: { flex: 1, justifyContent: "flex-end", paddingBottom: 48 },
  loginAccentBar: { width: 32, height: 3, borderRadius: 2, backgroundColor: Colors.accent, marginBottom: 16, opacity: 0.8 },
  loginTitle: { fontSize: 28, fontFamily: "Pretendard-Medium", color: Colors.text, lineHeight: 40, marginBottom: 10 },
  loginSubtitle: { fontSize: 14, fontFamily: "Pretendard-Regular", color: Colors.textSub, lineHeight: 24, marginBottom: 48 },
  socialBtns: { gap: 12 },
  googleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  googleBtnText: { fontSize: 15, fontFamily: "Pretendard-Medium", color: Colors.text },
  appleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 18, backgroundColor: Colors.text },
  appleBtnText: { fontSize: 15, fontFamily: "Pretendard-Medium", color: Colors.white },
  logoPlaceholder: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.surface },
  appleLogoPlaceholder: { width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.2)" },
  loginDisclaimer: { fontSize: 12, fontFamily: "Pretendard-Regular", color: Colors.textHint, textAlign: "center" },
  allCheckRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: Colors.surface, borderRadius: 16, marginBottom: 8 },
  allCheckLabel: { fontSize: 15, fontFamily: "Pretendard-Medium", color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 8 },
  agreementRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, paddingHorizontal: 16 },
  agreementToggleArea: { flexDirection: "row", alignItems: "center", gap: 12 },
  agreementTextRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  agreementLabel: { fontSize: 14, fontFamily: "Pretendard-Regular", color: Colors.text },
  agreementTag: { fontSize: 12, fontFamily: "Pretendard-Regular", color: Colors.textHint },
  agreementLinkBtn: { paddingLeft: 12, paddingVertical: 4 },
  agreementArrow: { fontSize: 16, color: Colors.textHint, fontFamily: "Pretendard-Regular" },
  codeBoxRow: { flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 12 },
  codeBox: { width: 44, height: 52, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  codeChar: { fontSize: 20, fontFamily: "Pretendard-Medium", color: Colors.text },
  hiddenInput: { position: "absolute", opacity: 0, width: 1, height: 1 },
  errorText: { color: ERROR_COLOR, fontSize: 13, textAlign: "center", marginTop: 8, fontFamily: "Pretendard-Regular" },
  listGap12: { gap: 12 },
  roleCard: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 20 },
  roleEmoji: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  roleEmojiText: { fontSize: 22 },
  roleTitle: { fontSize: 15, fontFamily: "Pretendard-Medium", color: Colors.text },
  roleSub: { fontSize: 13, fontFamily: "Pretendard-Regular", color: Colors.textHint },
  radioBtn: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5 },
  textInput: { paddingVertical: 16, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1.5, backgroundColor: Colors.bg, fontSize: 16, fontFamily: "Pretendard-Regular", color: Colors.text },
  inputCounter: { fontSize: 12, fontFamily: "Pretendard-Regular", color: Colors.textHint, textAlign: "right", marginTop: 6 },
  photoSection: { flex: 1, alignItems: "center", gap: 20 },
  photoCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  profilePickImage: { width: 120, height: 120 },
  photoPlusIcon: { fontSize: 60, color: Colors.textHint, fontWeight: "200", marginTop: -4 },
  photoHint: { fontSize: 13, fontFamily: "Pretendard-Regular", color: Colors.textHint },
  bottomSheetOverlay: { flex: 1, backgroundColor: "rgba(46,34,22,0.5)", justifyContent: "flex-end" },
  bottomSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12 },
  bottomSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginBottom: 8 },
  bottomSheetItem: { paddingVertical: 18, paddingHorizontal: 24, alignItems: "center" },
  bottomSheetItemText: { fontSize: 16, fontFamily: "Pretendard-Medium", color: Colors.text },
  bottomSheetDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginHorizontal: 24 },
  floatingHeader: {
    paddingHorizontal: 28,
    backgroundColor: Colors.white,
    zIndex: 10,
    paddingTop: 8,
    paddingBottom: 16,
  },
  scrollListContent: {
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 20, // 버튼 영역과 겹치지 않게 여유 공간
  },
  bottomBtnArea: {
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 20 : 30, // 기기별 하단 여백 최적화
    backgroundColor: Colors.white,
    borderTopWidth: 0, // 경계선 없이 깔끔하게 처리
  },
  listGap10: {
    // 기존 Gap 방식 대신 Card 내부 marginBottom 사용 권장 (유지보수 용이)
  },
  familyTypeCard: {
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  familyTypeText: { fontSize: 15, fontFamily: "Pretendard-Regular" },
  familyTypeCustomInput: { paddingVertical: 0, paddingHorizontal: 0, borderWidth: 0, backgroundColor: "transparent" },
  notificationDim: {
    backgroundColor: "rgba(46, 34, 22, 0.55)",
  },
  notificationModalContent: {
    justifyContent: "flex-end",
  },
  notificationSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  notificationTitle: {
    fontSize: 22,
    fontFamily: "NanumSquareRound-Bold",
    color: Colors.text,
    lineHeight: 32,
    textAlign: "center",
    marginBottom: 10,
  },
  notificationSubtitle: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.textSub,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 28,
  },
  notificationSubtitleEm: {
    fontFamily: "Pretendard-Medium",
    color: Colors.accent,
  },
  mockupStack: {
    width: "100%",
    marginBottom: 28,
    gap: 12,
  },
  notifCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  notifCardContent: {
    flex: 1,
    gap: 2,
  },
  notifCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notifAppName: {
    fontSize: 12,
    fontFamily: "Pretendard-Medium",
    color: Colors.textSub,
  },
  notifEmojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  notifEmojiText: { fontSize: 24 },
  notifCardBody: {
    fontSize: 14,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
    lineHeight: 20,
  },
  notifCardTime: {
    fontSize: 11,
    fontFamily: "Pretendard-Regular",
    color: Colors.textHint,
    marginTop: 0,
  },
});
