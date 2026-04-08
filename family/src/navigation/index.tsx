import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Svg, { Path, Rect, Circle, Ellipse } from "react-native-svg";

import OnboardingScreen from "../screens/OnboardingScreen";
import HomeScreen from "../screens/HomeScreen";
import AlbumScreen from "../screens/Album";
import MailboxScreen from "../screens/MailboxScreen";
import MypageScreen from "../screens/Mypage";
import LetterWriteScreen from "../screens/LetterWrite";
import NotificationsScreen from "../screens/Notifications";
import ConceptQuestionScreen from "../screens/ConceptQuestion";
import SettingsScreen from "../screens/Settings";

// ─── Param List Types ─────────────────────────────────────────────────────────

export type OnboardingStackParamList = {
  Onboarding: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Album: undefined;
  Mailbox: undefined;
  Mypage: undefined;
};

export type RootStackParamList = {
  OnboardingStack: undefined;
  MainTab: undefined;
  LetterWrite: undefined;
  Notifications: undefined;
  ConceptQuestion: undefined;
  Settings: undefined;
};

// ─── Tab Icon Colors ──────────────────────────────────────────────────────────

const TAB_COLOR_DEFAULT  = "#AAAAAA";
const TAB_COLOR_ACTIVE   = "#E8955A";

// ─── Tab Icons ────────────────────────────────────────────────────────────────

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      {/* 지붕 */}
      <Path
        d="M3 10.5L12 3L21 10.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 몸체 */}
      <Path
        d="M5 9.5V20C5 20.55 5.45 21 6 21H18C18.55 21 19 20.55 19 20V9.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AlbumIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      {/* 사각형 프레임 */}
      <Rect
        x={3}
        y={3}
        width={18}
        height={18}
        rx={3}
        stroke={color}
        strokeWidth={2}
      />
      {/* 산 모양 */}
      <Path
        d="M3 16L8 11L12 15L16 10L21 16"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MailboxIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      {/* 봉투 몸체 */}
      <Path
        d="M3 7C3 5.9 3.9 5 5 5H19C20.1 5 21 5.9 21 7V17C21 18.1 20.1 19 19 19H5C3.9 19 3 18.1 3 17V7Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* 봉투 접힘선 */}
      <Path
        d="M3 7L12 13L21 7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MypageIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      {/* 머리 */}
      <Circle cx={12} cy={8} r={3.5} stroke={color} strokeWidth={2} />
      {/* 몸통 */}
      <Path
        d="M5 20C5 16.7 8.1 14 12 14C15.9 14 19 16.7 19 20"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Navigators ───────────────────────────────────────────────────────────────

const RootStack = createNativeStackNavigator<RootStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// ─── Onboarding Stack ─────────────────────────────────────────────────────────

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Onboarding" component={OnboardingScreen} />
    </OnboardingStack.Navigator>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

function MainTabNavigator() {
  return (
    <MainTab.Navigator
      initialRouteName="Mailbox"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: TAB_COLOR_ACTIVE,
        tabBarInactiveTintColor: TAB_COLOR_DEFAULT,
        tabBarStyle: {
          borderTopColor: "#F0D9C4",
        },
        tabBarIcon: ({ color }) => {
          if (route.name === "Home")    return <HomeIcon color={color} />;
          if (route.name === "Album")   return <AlbumIcon color={color} />;
          if (route.name === "Mailbox") return <MailboxIcon color={color} />;
          return <MypageIcon color={color} />;
        },
      })}
    >
      <MainTab.Screen name="Home"    component={HomeScreen}   options={{ tabBarLabel: "홈" }} />
      <MainTab.Screen name="Album"   component={AlbumScreen}  options={{ tabBarLabel: "앨범" }} />
      <MainTab.Screen name="Mailbox" component={MailboxScreen} options={{ tabBarLabel: "우체통" }} />
      <MainTab.Screen name="Mypage"  component={MypageScreen} options={{ tabBarLabel: "마이페이지" }} />
    </MainTab.Navigator>
  );
}

// ─── Root Navigator ───────────────────────────────────────────────────────────

export default function RootNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTab" component={MainTabNavigator} />
      <RootStack.Screen name="OnboardingStack" component={OnboardingNavigator} />
      <RootStack.Screen
        name="LetterWrite"
        component={LetterWriteScreen}
        options={{ presentation: "modal" }}
      />
      <RootStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ presentation: "modal" }}
      />
      <RootStack.Screen
        name="ConceptQuestion"
        component={ConceptQuestionScreen}
        options={{ presentation: "modal" }}
      />
      <RootStack.Screen name="Settings" component={SettingsScreen} />
    </RootStack.Navigator>
  );
}
