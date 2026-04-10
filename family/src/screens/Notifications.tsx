import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";

export default function NotificationsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>알림</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: Colors.text,
    fontSize: 18,
    fontFamily: "Pretendard-Regular",
  },
});
