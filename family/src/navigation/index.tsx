import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import OnboardingScreen from "../screens/OnboardingScreen";
import HomeScreen from "../screens/HomeScreen";
import AlbumScreen from "../screens/Album";
import MypageScreen from "../screens/Mypage";
import NotificationsScreen from "../screens/NotificationsScreen";
import AlbumPhotosScreen from "../screens/AlbumPhotos";
import AlbumDetailScreen from "../screens/AlbumDetail";
import ConceptCategoriesScreen from "../screens/ConceptCategories";
import ConceptQuestionsScreen from "../screens/ConceptQuestions";
import ConceptAnswerScreen from "../screens/ConceptAnswer";
import SettingsScreen from "../screens/Settings";

import { Colors } from "../constants/colors";

import type {
  OnboardingStackParamList,
  MainTabParamList,
  MainTabStackParamList,
  RootStackParamList,
} from "./types";

export type {
  OnboardingStackParamList,
  MainTabParamList,
  MainTabStackParamList,
  RootStackParamList,
};

// ─── Floating tab bar ─────────────────────────────────────────────────────────

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: "absolute",
        bottom: insets.bottom + 4,
        left: 0,
        right: 0,
        alignItems: "center",
        pointerEvents: "box-none",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "#FFFFFF",
          borderRadius: 26,
          paddingVertical: 4,
          paddingHorizontal: 4,
          gap: 2,
          shadowColor: "#5A3E1B",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 18,
          elevation: 12,
        }}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          let label = "";
          if (route.name === "Home") {
            label = "홈";
          } else if (route.name === "Album") {
            label = "앨범";
          } else if (route.name === "MyPage") {
            label = "마이페이지";
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.85}
              style={{
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: 80,
                paddingVertical: 8,
                borderRadius: 22,
                backgroundColor: isFocused ? "#F0D9C4" : "transparent",
                gap: 3,
              }}
            >
              {route.name === "Home" && (
                <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V10.5Z"
                    fill={isFocused ? Colors.accent : "#AAAAAA"}
                  />
                </Svg>
              )}
              {route.name === "Album" && (
                <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z"
                    fill={isFocused ? Colors.accent : "#AAAAAA"}
                  />
                </Svg>
              )}
              {route.name === "MyPage" && (
                <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
                    fill={isFocused ? Colors.accent : "#AAAAAA"}
                  />
                </Svg>
              )}
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Pretendard-Medium",
                  color: isFocused ? Colors.accent : "#AAAAAA",
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Navigators ───────────────────────────────────────────────────────────────

const RootStack = createNativeStackNavigator<RootStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const MainTabStack = createNativeStackNavigator<MainTabStackParamList>();
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
      initialRouteName="Home"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <MainTab.Screen name="Home" component={HomeScreen} />
      <MainTab.Screen name="Album" component={AlbumScreen} />
      <MainTab.Screen name="MyPage" component={MypageScreen} />
    </MainTab.Navigator>
  );
}

// ─── Main Tab Stack (탭 + 탭 위 모달/풀스크린) ─────────────────────────────────

function MainTabStackNavigator() {
  return (
    <MainTabStack.Navigator screenOptions={{ headerShown: false }}>
      <MainTabStack.Screen name="MainTab" component={MainTabNavigator} />
      <MainTabStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ gestureEnabled: true, gestureDirection: "horizontal" }}
      />
      <MainTabStack.Screen name="AlbumPhotos" component={AlbumPhotosScreen} options={{ headerShown: false }} />
      <MainTabStack.Screen name="AlbumDetail" component={AlbumDetailScreen} options={{ headerShown: false }} />
      <MainTabStack.Screen name="ConceptCategories" component={ConceptCategoriesScreen} options={{ headerShown: false }} />
      <MainTabStack.Screen name="ConceptQuestions" component={ConceptQuestionsScreen} options={{ headerShown: false }} />
      <MainTabStack.Screen name="ConceptAnswer" component={ConceptAnswerScreen} options={{ headerShown: false }} />
    </MainTabStack.Navigator>
  );
}

// ─── Root Navigator ───────────────────────────────────────────────────────────

export default function RootNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTab" component={MainTabStackNavigator} />
      <RootStack.Screen name="OnboardingStack" component={OnboardingNavigator} />
      <RootStack.Screen name="Settings" component={SettingsScreen} />
    </RootStack.Navigator>
  );
}
