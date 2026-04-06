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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Colors } from "../constants/colors";

// ─── Static Data ──────────────────────────────────────────────────────────────

const ROLES = [
  { emoji: "👨", title: "든든한 버팀목", sub: "아빠" },
  { emoji: "👩", title: "따뜻한 햇살", sub: "엄마" },
  { emoji: "🧒", title: "사랑스러운 복덩이", sub: "자녀" },
];

const FAMILY_TYPES = [
  "웃음이 끊이지 않는 가족",
  "대화가 많은 가족",
  "항상 건강한 가족",
  "함께 있을 때 편안한 가족",
  "기타 (직접 입력)",
];

const AGREEMENT_ITEMS = [
  { key: "terms" as const, label: "서비스 이용약관 동의", req: true },
  { key: "privacy" as const, label: "개인정보 수집 동의", req: true },
  { key: "marketing" as const, label: "마케팅 수신 동의", req: false },
];

const CODE_LENGTH = 6;
const MAX_NICKNAME = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

type ScreenProps = { onNext: () => void; onSkip?: () => void };
type AgreementKey = "terms" | "privacy" | "marketing";

// ─── Icons ────────────────────────────────────────────────────────────────────

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

// ─── Shared Components ────────────────────────────────────────────────────────

function StepIndicator({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.stepIndicator}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            {
              width: i === current ? 20 : 6,
              backgroundColor: i === current ? Colors.accent : Colors.border,
            },
          ]}
        />
      ))}
    </View>
  );
}

function BtnPrimary({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.8}
      style={[styles.btnPrimary, { backgroundColor: disabled ? Colors.border : Colors.accent }]}
    >
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
    <TouchableOpacity
      onPress={onToggle}
      style={[
        styles.checkbox,
        {
          borderColor: checked ? Colors.accent : Colors.border,
          backgroundColor: checked ? Colors.accent : Colors.white,
        },
      ]}
    >
      {checked && <View style={styles.checkmark} />}
    </TouchableOpacity>
  );
}

// ─── Screen 1: Login ──────────────────────────────────────────────────────────

function LoginScreen({ onNext }: ScreenProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.loginHero}>
        <View style={styles.loginAccentBar} />
        <Text style={styles.loginTitle}>{"가까운듯\n먼 사이"}</Text>
        <Text style={styles.loginSubtitle}>가족과 더 가까워지는 따뜻한 공간</Text>

        <View style={styles.socialBtns}>
          {/* 구글 로그인 (UI only) */}
          <TouchableOpacity onPress={onNext} activeOpacity={0.8} style={styles.googleBtn}>
            <View style={styles.logoPlaceholder} />
            <Text style={styles.googleBtnText}>구글로 로그인</Text>
          </TouchableOpacity>

          {/* 애플 로그인 (UI only) */}
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

// ─── Screen 2: Agreement ──────────────────────────────────────────────────────

function AgreementScreen({ onNext }: ScreenProps) {
  const [allChecked, setAllChecked] = useState(false);
  const [checks, setChecks] = useState<Record<AgreementKey, boolean>>({
    terms: false,
    privacy: false,
    marketing: false,
  });

  const toggle = (key: AgreementKey) => {
    const next = { ...checks, [key]: !checks[key] };
    setChecks(next);
    setAllChecked(next.terms && next.privacy && next.marketing);
  };

  const toggleAll = () => {
    const next = !allChecked;
    setAllChecked(next);
    setChecks({ terms: next, privacy: next, marketing: next });
  };

  const canNext = checks.terms && checks.privacy;

  return (
    <View style={[styles.screen, styles.screenTopAgreement]}>
      <Text style={styles.screenTitle}>{"서비스 이용을 위해\n동의가 필요해요"}</Text>
      <Text style={styles.screenSubtitle}>아래 항목을 확인해 주세요</Text>

      <TouchableOpacity onPress={toggleAll} style={styles.allCheckRow}>
        <Checkbox checked={allChecked} onToggle={toggleAll} />
        <Text style={styles.allCheckLabel}>전체 동의</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      {AGREEMENT_ITEMS.map(({ key, label, req }) => (
        <TouchableOpacity key={key} onPress={() => toggle(key)} style={styles.agreementRow}>
          <Checkbox checked={checks[key]} onToggle={() => toggle(key)} />
          <Text style={styles.agreementLabel}>{label}</Text>
          <Text style={styles.agreementTag}>({req ? "필수" : "선택"})</Text>
        </TouchableOpacity>
      ))}

      <View style={{ flex: 1 }} />
      <BtnPrimary label="다음" onPress={onNext} disabled={!canNext} />
    </View>
  );
}

// ─── Screen 3: Invite Code ────────────────────────────────────────────────────

function InviteCodeScreen({ onNext, onSkip }: ScreenProps) {
  const [code, setCode] = useState("");
  const inputRef = useRef<TextInput>(null);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.screen, styles.screenTop]}>
        <StepIndicator total={5} current={0} />
        <Text style={styles.screenTitle}>{"가족 코드가\n있으신가요?"}</Text>
        <Text style={[styles.screenSubtitle, { marginBottom: 40 }]}>
          가족에게 받은 코드를 입력해 주세요
        </Text>

        {/* 6자리 코드 박스 — 터치 시 숨겨진 TextInput 포커스 */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => inputRef.current?.focus()}
          style={styles.codeBoxRow}
        >
          {Array.from({ length: CODE_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.codeBox,
                {
                  borderColor: code[i] ? Colors.accent : Colors.border,
                  backgroundColor: code[i] ? Colors.accentLight : Colors.bg,
                },
              ]}
            >
              <Text style={styles.codeChar}>{code[i] ?? ""}</Text>
            </View>
          ))}
        </TouchableOpacity>

        {/* 실제 입력을 받는 숨겨진 TextInput */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(text) => setCode(text.slice(0, CODE_LENGTH).toUpperCase())}
          maxLength={CODE_LENGTH}
          style={styles.hiddenInput}
          autoFocus
          autoCapitalize="characters"
          keyboardType="ascii-capable"
        />

        <View style={{ flex: 1 }} />
        <BtnPrimary label="확인" onPress={onNext} disabled={code.length !== CODE_LENGTH} />
        <View style={{ height: 8 }} />
        <BtnGhost label="코드가 없어요" onPress={onSkip!} />
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Screen 4: Role Select ────────────────────────────────────────────────────

function RoleSelectScreen({ onNext }: ScreenProps) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <View style={[styles.screen, styles.screenTop]}>
      <StepIndicator total={5} current={1} />
      <Text style={styles.screenTitle}>{"나는 어떤\n가족인가요?"}</Text>
      <Text style={styles.screenSubtitle}>역할을 선택해 주세요</Text>

      <View style={styles.listGap12}>
        {ROLES.map((role, i) => {
          const isSelected = selected === i;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => setSelected(i)}
              activeOpacity={0.8}
              style={[
                styles.roleCard,
                {
                  borderColor: isSelected ? Colors.accent : Colors.border,
                  borderWidth: isSelected ? 2 : 1,
                  backgroundColor: isSelected ? Colors.accentLight : Colors.white,
                },
              ]}
            >
              <View
                style={[
                  styles.roleEmoji,
                  {
                    backgroundColor: isSelected
                      ? "rgba(232,149,90,0.15)"
                      : Colors.surface,
                  },
                ]}
              >
                <Text style={styles.roleEmojiText}>{role.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleTitle}>{role.title}</Text>
                <Text style={styles.roleSub}>{role.sub}</Text>
              </View>
              <View
                style={[
                  styles.radioBtn,
                  {
                    borderColor: isSelected ? Colors.accent : Colors.border,
                    backgroundColor: isSelected ? Colors.accent : Colors.white,
                  },
                ]}
              />
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

// ─── Screen 5: Nickname ───────────────────────────────────────────────────────

function NicknameScreen({ onNext }: ScreenProps) {
  const [nickname, setNickname] = useState("");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.screen, styles.screenTop]}>
        <StepIndicator total={5} current={2} />
        <Text style={[styles.screenTitle, { marginBottom: 40 }]}>어떻게 불러드릴까요?</Text>

        <View>
          <TextInput
            value={nickname}
            onChangeText={(text) => setNickname(text.slice(0, MAX_NICKNAME))}
            placeholder="닉네임 입력"
            placeholderTextColor={Colors.textHint}
            style={[
              styles.textInput,
              { borderColor: nickname ? Colors.accent : Colors.border },
            ]}
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

// ─── Screen 6: Profile Photo ──────────────────────────────────────────────────

function ProfilePhotoScreen({ onNext }: ScreenProps) {
  const [hasPhoto, setHasPhoto] = useState(false);

  return (
    <View style={[styles.screen, styles.screenTop]}>
      <StepIndicator total={5} current={3} />
      <Text style={styles.screenTitle}>{"프로필 사진을\n설정해주세요"}</Text>
      <Text style={[styles.screenSubtitle, { marginBottom: 48 }]}>
        가족들에게 보여질 사진이에요
      </Text>

      <View style={styles.photoSection}>
        <TouchableOpacity onPress={() => setHasPhoto(true)} activeOpacity={0.8}>
          <View
            style={[
              styles.photoCircle,
              {
                backgroundColor: hasPhoto ? Colors.surface : Colors.bg,
                borderColor: hasPhoto ? Colors.accent : Colors.border,
              },
            ]}
          >
            <Text style={styles.photoEmoji}>{hasPhoto ? "🧒" : "👤"}</Text>
          </View>
          {/* 카메라 아이콘 배지 */}
          <View style={styles.cameraBtn}>
            <Text style={styles.cameraIcon}>📷</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.photoHint}>터치해서 사진 선택</Text>
      </View>

      <BtnPrimary label="다음" onPress={onNext} />
      <View style={{ height: 8 }} />
      <BtnGhost label="나중에 설정할게요" onPress={onNext} />
    </View>
  );
}

// ─── Screen 7: Family Type ────────────────────────────────────────────────────

function FamilyTypeScreen({ onNext }: ScreenProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [customText, setCustomText] = useState("");

  const lastIndex = FAMILY_TYPES.length - 1;
  const isCustomSelected = selected === lastIndex;
  const canNext =
    selected !== null && (isCustomSelected ? customText.trim().length > 0 : true);

  const handleSelect = (i: number) => {
    if (i !== lastIndex) Keyboard.dismiss();
    setSelected(i);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.screen, styles.screenTop]}>
        <StepIndicator total={5} current={4} />
        <Text style={styles.screenTitle}>{"우리 가족은 어떤\n가족이 되고 싶나요?"}</Text>
        <Text style={styles.screenSubtitle}>원하는 모습을 골라주세요</Text>

        <View style={styles.listGap10}>
          {FAMILY_TYPES.map((type, i) => {
            const isSelected = selected === i;
            const isLast = i === lastIndex;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => handleSelect(i)}
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
                        fontWeight: isSelected ? "500" : "400",
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

        <View style={{ flex: 1 }} />
        <View style={{ height: 32 }} />
        <BtnPrimary label="시작하기" onPress={onNext} disabled={!canNext} />
      </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// ─── Screen Registry ──────────────────────────────────────────────────────────

const SCREENS: Array<React.ComponentType<ScreenProps>> = [
  LoginScreen,
  AgreementScreen,
  InviteCodeScreen,
  RoleSelectScreen,
  NicknameScreen,
  ProfilePhotoScreen,
  FamilyTypeScreen,
];

// ─── Main Onboarding ──────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  const next = () => setStep((s) => Math.min(s + 1, SCREENS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const CurrentScreen = SCREENS[step];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {step > 0 && (
        <TouchableOpacity
          onPress={back}
          activeOpacity={0.7}
          style={[styles.backBtn, { top: insets.top }]}
        >
          <ChevronLeftIcon size={32} color={Colors.textSub} />
        </TouchableOpacity>
      )}
      <CurrentScreen onNext={next} onSkip={next} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  // ── Back Button ────────────────────────────────────────────────────────────
  backBtn: {
    position: "absolute",
    left: 8,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  // ── Layout ─────────────────────────────────────────────────────────────────
  screen: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  screenTop: {
    paddingTop: 32,
  },
  // AgreementScreen은 StepIndicator가 없으므로
  // 다른 화면(screenTop 32 + indicator marginTop 8 + height 6 + marginBottom 32)과
  // 타이틀 높이를 맞추기 위해 paddingTop을 보정
  screenTopAgreement: {
    paddingTop: 78,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "500",
    color: Colors.text,
    lineHeight: 32,
    marginBottom: 8,
  },
  screenSubtitle: {
    fontSize: 14,
    color: Colors.textSub,
    lineHeight: 22,
    marginBottom: 32,
  },

  // ── Step Indicator ─────────────────────────────────────────────────────────
  stepIndicator: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 32,
  },
  stepDot: {
    height: 6,
    borderRadius: 3,
  },

  // ── Buttons ────────────────────────────────────────────────────────────────
  btnPrimary: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: "500",
  },
  btnGhost: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhostText: {
    fontSize: 14,
    color: Colors.textHint,
  },

  // ── Checkbox ───────────────────────────────────────────────────────────────
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    width: 5,
    height: 9,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: Colors.white,
    transform: [{ rotate: "45deg" }],
    marginTop: -2,
  },

  // ── Login Screen ───────────────────────────────────────────────────────────
  loginHero: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 48,
  },
  loginAccentBar: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.accent,
    marginBottom: 16,
    opacity: 0.8,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: "500",
    color: Colors.text,
    lineHeight: 40,
    marginBottom: 10,
  },
  loginSubtitle: {
    fontSize: 14,
    color: Colors.textSub,
    lineHeight: 24,
    marginBottom: 48,
  },
  socialBtns: {
    gap: 12,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  googleBtnText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: "500",
  },
  appleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 18,
    backgroundColor: Colors.text,
  },
  appleBtnText: {
    fontSize: 15,
    color: Colors.white,
    fontWeight: "500",
  },
  logoPlaceholder: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.surface,
  },
  appleLogoPlaceholder: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  loginDisclaimer: {
    fontSize: 12,
    color: Colors.textHint,
    textAlign: "center",
  },

  // ── Agreement Screen ───────────────────────────────────────────────────────
  allCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 8,
  },
  allCheckLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 8,
  },
  agreementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 4,
  },
  agreementLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  agreementTag: {
    fontSize: 12,
    color: Colors.textHint,
  },

  // ── Invite Code Screen ─────────────────────────────────────────────────────
  codeBoxRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginBottom: 12,
  },
  codeBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  codeChar: {
    fontSize: 20,
    fontWeight: "500",
    color: Colors.text,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },

  // ── Role Select Screen ─────────────────────────────────────────────────────
  listGap12: {
    gap: 12,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  roleEmoji: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  roleEmojiText: {
    fontSize: 22,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.text,
  },
  roleSub: {
    fontSize: 13,
    color: Colors.textHint,
  },
  radioBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },

  // ── Nickname Screen ────────────────────────────────────────────────────────
  textInput: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: Colors.bg,
    fontSize: 16,
    color: Colors.text,
  },
  inputCounter: {
    fontSize: 12,
    color: Colors.textHint,
    textAlign: "right",
    marginTop: 6,
  },

  // ── Profile Photo Screen ───────────────────────────────────────────────────
  photoSection: {
    flex: 1,
    alignItems: "center",
    gap: 20,
  },
  photoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  photoEmoji: {
    fontSize: 56,
  },
  cameraBtn: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraIcon: {
    fontSize: 14,
  },
  photoHint: {
    fontSize: 13,
    color: Colors.textHint,
  },

  // ── Family Type Screen ─────────────────────────────────────────────────────
  listGap10: {
    gap: 10,
  },
  familyTypeCard: {
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  familyTypeText: {
    fontSize: 15,
  },
  // textInput 스타일을 기반으로 카드 내부 padding 상쇄
  familyTypeCustomInput: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
});
