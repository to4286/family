import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";

export default function ConceptQuestionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>컨셉 질문</Text>
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
  },
});
