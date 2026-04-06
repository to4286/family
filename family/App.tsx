import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import RootNavigator from "./src/navigation";
import { Colors } from "./src/constants/colors";

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" backgroundColor={Colors.bg} />
      <RootNavigator />
    </NavigationContainer>
  );
}
