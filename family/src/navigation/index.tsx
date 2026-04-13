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
import NotificationsScreen from "../screens/NotificationsScreen";
import ConceptQuestionScreen from "../screens/ConceptQuestion";
import SettingsScreen from "../screens/Settings";

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

// ─── Tab Icon Colors ──────────────────────────────────────────────────────────

const TAB_COLOR_DEFAULT  = "#AAAAAA";
const TAB_COLOR_ACTIVE   = "#E8955A";

// ─── Tab Icons ────────────────────────────────────────────────────────────────

function HomeIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      {focused ? (
        <Path
          d="M4 19V10C4 9.68333 4.071 9.38333 4.213 9.1C4.355 8.81667 4.55067 8.58333 4.8 8.4L10.8 3.9C11.15 3.63333 11.55 3.5 12 3.5C12.45 3.5 12.85 3.63333 13.2 3.9L19.2 8.4C19.45 8.58333 19.646 8.81667 19.788 9.1C19.93 9.38333 20.0007 9.68333 20 10V19C20 19.55 19.804 20.021 19.412 20.413C19.02 20.805 18.5493 21.0007 18 21H15C14.7167 21 14.4793 20.904 14.288 20.712C14.0967 20.52 14.0007 20.2827 14 20V15C14 14.7167 13.904 14.4793 13.712 14.288C13.52 14.0967 13.2827 14.0007 13 14H11C10.7167 14 10.4793 14.096 10.288 14.288C10.0967 14.48 10.0007 14.7173 10 15V20C10 20.2833 9.904 20.521 9.712 20.713C9.52 20.905 9.28267 21.0007 9 21H6C5.45 21 4.97933 20.8043 4.588 20.413C4.19667 20.0217 4.00067 19.5507 4 19Z"
          fill={color}
        />
      ) : (
        <Path
          d="M6 19H9V14C9 13.7167 9.096 13.4793 9.288 13.288C9.48 13.0967 9.71733 13.0007 10 13H14C14.2833 13 14.521 13.096 14.713 13.288C14.905 13.48 15.0007 13.7173 15 14V19H18V10L12 5.5L6 10V19ZM4 19V10C4 9.68333 4.071 9.38333 4.213 9.1C4.355 8.81667 4.55067 8.58333 4.8 8.4L10.8 3.9C11.15 3.63333 11.55 3.5 12 3.5C12.45 3.5 12.85 3.63333 13.2 3.9L19.2 8.4C19.45 8.58333 19.646 8.81667 19.788 9.1C19.93 9.38333 20.0007 9.68333 20 10V19C20 19.55 19.804 20.021 19.412 20.413C19.02 20.805 18.5493 21.0007 18 21H14C13.7167 21 13.4793 20.904 13.288 20.712C13.0967 20.52 13.0007 20.2827 13 20V15H11V20C11 20.2833 10.904 20.521 10.712 20.713C10.52 20.905 10.2827 21.0007 10 21H6C5.45 21 4.97933 20.8043 4.588 20.413C4.19667 20.0217 4.00067 19.5507 4 19Z"
          fill={color}
        />
      )}
    </Svg>
  );
}

function AlbumIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      {focused ? (
        <Path
          d="M21.75 3.75H2.25C1.83516 3.75 1.5 4.08516 1.5 4.5V19.5C1.5 19.9148 1.83516 20.25 2.25 20.25H21.75C22.1648 20.25 22.5 19.9148 22.5 19.5V4.5C22.5 4.08516 22.1648 3.75 21.75 3.75ZM7.92188 7.125C8.74922 7.125 9.42188 7.79766 9.42188 8.625C9.42188 9.45234 8.74922 10.125 7.92188 10.125C7.09453 10.125 6.42188 9.45234 6.42188 8.625C6.42188 7.79766 7.09453 7.125 7.92188 7.125ZM19.9664 17.3695C19.9323 17.3982 19.8891 17.414 19.8445 17.4141H4.15312C4.05 17.4141 3.96562 17.3297 3.96562 17.2266C3.96562 17.182 3.98203 17.1398 4.01016 17.1047L8.00156 12.3703C8.06719 12.2906 8.18672 12.2812 8.26641 12.3469C8.27344 12.3539 8.28281 12.3609 8.28984 12.3703L10.6195 15.1359L14.325 10.7414C14.3906 10.6617 14.5102 10.6523 14.5898 10.718C14.5969 10.725 14.6062 10.732 14.6133 10.7414L19.9945 17.107C20.0555 17.1844 20.0461 17.3039 19.9664 17.3695Z"
          fill={color}
        />
      ) : (
        <Path
          d="M21.75 3.75H2.25C1.83516 3.75 1.5 4.08516 1.5 4.5V19.5C1.5 19.9148 1.83516 20.25 2.25 20.25H21.75C22.1648 20.25 22.5 19.9148 22.5 19.5V4.5C22.5 4.08516 22.1648 3.75 21.75 3.75ZM20.8125 18.5625H3.1875V17.6273L6.43359 13.7766L9.95156 17.9484L15.4242 11.4609L20.8125 17.85V18.5625ZM20.8125 15.5203L15.5672 9.3C15.4922 9.21094 15.3563 9.21094 15.2812 9.3L9.95156 15.6188L6.57656 11.618C6.50156 11.5289 6.36562 11.5289 6.29062 11.618L3.1875 15.2977V5.4375H20.8125V15.5203ZM7.125 10.6875C7.39585 10.6875 7.66405 10.6342 7.91428 10.5305C8.16452 10.4269 8.39189 10.2749 8.58341 10.0834C8.77493 9.89189 8.92685 9.66452 9.0305 9.41428C9.13415 9.16405 9.1875 8.89585 9.1875 8.625C9.1875 8.35415 9.13415 8.08595 9.0305 7.83572C8.92685 7.58548 8.77493 7.35811 8.58341 7.16659C8.39189 6.97507 8.16452 6.82315 7.91428 6.7195C7.66405 6.61585 7.39585 6.5625 7.125 6.5625C6.57799 6.5625 6.05339 6.7798 5.66659 7.16659C5.2798 7.55339 5.0625 8.07799 5.0625 8.625C5.0625 9.17201 5.2798 9.69661 5.66659 10.0834C6.05339 10.4702 6.57799 10.6875 7.125 10.6875Z"
          fill={color}
        />
      )}
    </Svg>
  );
}

function MailboxIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      {focused ? (
        <Path
          d="M21.2308 3.69141H2.76923C1.2 3.69141 0 4.89141 0 6.46064V17.5376C0 19.1068 1.2 20.3068 2.76923 20.3068H21.2308C22.8 20.3068 24 19.1068 24 17.5376V6.46064C24 4.89141 22.8 3.69141 21.2308 3.69141ZM21.9692 17.9068L14.7692 12.7376L12 14.5837L9.13846 12.7376L2.03077 17.9068L7.84615 11.9068L0.738462 6.36833L12 12.4606L23.1692 6.46064L16.1538 11.9991L21.9692 17.9068Z"
          fill={color}
        />
      ) : (
        <Path
          d="M2.76923 3.69141C1.24062 3.69141 0 4.93202 0 6.46064V17.5376C0 19.0662 1.24062 20.3068 2.76923 20.3068H21.2308C22.7594 20.3068 24 19.0662 24 17.5376V6.46064C24 4.93202 22.7594 3.69141 21.2308 3.69141H2.76923ZM2.76923 5.53756H21.2308C21.7394 5.53756 22.1538 5.95202 22.1538 6.46064V6.92218L12 12.4034L1.84615 6.92218V6.46064C1.84615 5.95202 2.26062 5.53756 2.76923 5.53756ZM1.84615 7.18156L7.87477 11.8837L1.96154 17.9419L9.17354 12.8068L12 14.6243L14.8274 12.8068L22.0385 17.9419L16.1252 11.8837L22.1538 7.18156V17.5376C22.1487 17.6797 22.1091 17.8184 22.0385 17.9419C21.8862 18.2419 21.5898 18.4606 21.2308 18.4606H2.76923C2.41015 18.4606 2.11385 18.2428 1.96154 17.9419C1.891 17.8187 1.85141 17.6794 1.84615 17.5376V7.18156Z"
          fill={color}
        />
      )}
    </Svg>
  );
}

function MypageIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      {focused ? (
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8 7C8 5.93913 8.42143 4.92172 9.17157 4.17157C9.92172 3.42143 10.9391 3 12 3C13.0609 3 14.0783 3.42143 14.8284 4.17157C15.5786 4.92172 16 5.93913 16 7C16 8.06087 15.5786 9.07828 14.8284 9.82843C14.0783 10.5786 13.0609 11 12 11C10.9391 11 9.92172 10.5786 9.17157 9.82843C8.42143 9.07828 8 8.06087 8 7ZM8 13C6.67392 13 5.40215 13.5268 4.46447 14.4645C3.52678 15.4021 3 16.6739 3 18C3 18.7956 3.31607 19.5587 3.87868 20.1213C4.44129 20.6839 5.20435 21 6 21H18C18.7956 21 19.5587 20.6839 20.1213 20.1213C20.6839 19.5587 21 18.7956 21 18C21 16.6739 20.4732 15.4021 19.5355 14.4645C18.5979 13.5268 17.3261 13 16 13H8Z"
          fill={color}
        />
      ) : (
        <>
          <Path
            d="M4 18C4 16.9391 4.42143 15.9217 5.17157 15.1716C5.92172 14.4214 6.93913 14 8 14H16C17.0609 14 18.0783 14.4214 18.8284 15.1716C19.5786 15.9217 20 16.9391 20 18C20 18.5304 19.7893 19.0391 19.4142 19.4142C19.0391 19.7893 18.5304 20 18 20H6C5.46957 20 4.96086 19.7893 4.58579 19.4142C4.21071 19.0391 4 18.5304 4 18Z"
            stroke={color}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <Path
            d="M12 10C13.6569 10 15 8.65685 15 7C15 5.34315 13.6569 4 12 4C10.3431 4 9 5.34315 9 7C9 8.65685 10.3431 10 12 10Z"
            stroke={color}
            strokeWidth={1.5}
          />
        </>
      )}
    </Svg>
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
      initialRouteName="Mailbox"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: TAB_COLOR_ACTIVE,
        tabBarInactiveTintColor: TAB_COLOR_DEFAULT,
        tabBarStyle: {
          borderTopColor: "#F0D9C4",
        },
        tabBarIcon: ({ color, focused }) => {
          if (route.name === "Home")    return <HomeIcon color={color} focused={focused} />;
          if (route.name === "Album")   return <AlbumIcon color={color} focused={focused} />;
          if (route.name === "Mailbox") return <MailboxIcon color={color} focused={focused} />;
          return <MypageIcon color={color} focused={focused} />;
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
    </MainTabStack.Navigator>
  );
}

// ─── Root Navigator ───────────────────────────────────────────────────────────

export default function RootNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTab" component={MainTabStackNavigator} />
      <RootStack.Screen name="OnboardingStack" component={OnboardingNavigator} />
      <RootStack.Screen
        name="LetterWrite"
        component={LetterWriteScreen}
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
