import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";

export default function ConceptAnswerScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>질문 상세 (준비 중)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 16, fontFamily: "Pretendard-Regular", color: Colors.textHint },
});
