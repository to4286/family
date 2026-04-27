import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import RootNavigator, { type RootStackEntryRoute } from "./src/navigation";
import { Colors } from "./src/constants/colors";
import { supabase } from "./src/utils/supabase";

/**
 * Supabase 세션 + members 가입 여부에 따라 루트 스택의 최초 화면을 결정한다.
 * (App 시작 시 1회; 네비게이터 initialRouteName과 동기화)
 */
async function resolveRootEntryRoute(): Promise<RootStackEntryRoute> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return "OnboardingStack";
  }

  const { data, error } = await supabase
    .from("members")
    .select("id")
    .eq("auth_uid", session.user.id)
    .single();

  if (error || !data) {
    return "OnboardingStack";
  }
  return "MainTab";
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<RootStackEntryRoute>("OnboardingStack");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await SplashScreen.preventAutoHideAsync();

        const [, entryRoute] = await Promise.all([
          Font.loadAsync({
            "Pretendard-Regular": require("./src/assets/fonts/Pretendard-Regular.otf"),
            "Pretendard-Medium": require("./src/assets/fonts/Pretendard-Medium.otf"),
            "Pretendard-Bold": require("./src/assets/fonts/Pretendard-Bold.otf"),
            "NanumSquareRound-Light": require("./src/assets/fonts/NanumSquareRoundL.ttf"),
            "NanumSquareRound-Regular": require("./src/assets/fonts/NanumSquareRoundR.ttf"),
            "NanumSquareRound-Bold": require("./src/assets/fonts/NanumSquareRoundB.ttf"),
            "NanumSquareRound-ExtraBold": require("./src/assets/fonts/NanumSquareRoundEB.ttf"),
          }),
          resolveRootEntryRoute(),
        ]);

        if (cancelled) {
          return;
        }
        setInitialRoute(entryRoute);
      } catch {
        if (!cancelled) {
          setInitialRoute("OnboardingStack");
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
          await SplashScreen.hideAsync();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isReady) {
    return <View />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" backgroundColor={Colors.bg} />
      <RootNavigator initialRouteName={initialRoute} />
    </NavigationContainer>
  );
}
