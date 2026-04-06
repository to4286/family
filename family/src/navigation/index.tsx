import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import OnboardingScreen from "../screens/OnboardingScreen";
import HomeScreen from "../screens/Home";
import AlbumScreen from "../screens/Album";
import MailboxScreen from "../screens/Mailbox";
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
    <MainTab.Navigator screenOptions={{ headerShown: false }}>
      <MainTab.Screen name="Home" component={HomeScreen} />
      <MainTab.Screen name="Album" component={AlbumScreen} />
      <MainTab.Screen name="Mailbox" component={MailboxScreen} />
      <MainTab.Screen name="Mypage" component={MypageScreen} />
    </MainTab.Navigator>
  );
}

// ─── Root Navigator ───────────────────────────────────────────────────────────

export default function RootNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="OnboardingStack" component={OnboardingNavigator} />
      <RootStack.Screen name="MainTab" component={MainTabNavigator} />
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
