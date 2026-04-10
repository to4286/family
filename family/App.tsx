import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import RootNavigator from "./src/navigation";
import { Colors } from "./src/constants/colors";

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
    Font.loadAsync({
      "Pretendard-Regular": require("./src/assets/fonts/Pretendard-Regular.otf"),
      "Pretendard-Medium":  require("./src/assets/fonts/Pretendard-Medium.otf"),
      "Pretendard-Bold":    require("./src/assets/fonts/Pretendard-Bold.otf"),
    }).then(() => {
      setFontsLoaded(true);
      SplashScreen.hideAsync();
    });
  }, []);

  if (!fontsLoaded) return <View />;

  return (
    <NavigationContainer>
      <StatusBar style="dark" backgroundColor={Colors.bg} />
      <RootNavigator />
    </NavigationContainer>
  );
}
