import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/colors";

export const BOTTOM_SHEET_SLIDE_OFFSET = 300;
export const BOTTOM_SHEET_OPEN_MS = 250;
export const BOTTOM_SHEET_CLOSE_MS = 200;

/** `animationType="none"`로 모달이 바로 사라진 뒤 ImagePicker present까지의 최소 간격 (iOS VC 안정화) */
const PICKER_OPEN_DELAY_MS = 100;

type PhotoSelectionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectAlbum: () => void;
  onTakePhoto: () => void;
};

export default function PhotoSelectionModal({
  visible,
  onClose,
  onSelectAlbum,
  onTakePhoto,
}: PhotoSelectionModalProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(BOTTOM_SHEET_SLIDE_OFFSET)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(BOTTOM_SHEET_SLIDE_OFFSET);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: BOTTOM_SHEET_OPEN_MS, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: BOTTOM_SHEET_OPEN_MS, useNativeDriver: true })
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: BOTTOM_SHEET_SLIDE_OFFSET, duration: BOTTOM_SHEET_CLOSE_MS, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: BOTTOM_SHEET_CLOSE_MS, useNativeDriver: true })
    ]).start(() => onClose());
  };

  const handleAction = (action: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: BOTTOM_SHEET_SLIDE_OFFSET, duration: BOTTOM_SHEET_CLOSE_MS, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: BOTTOM_SHEET_CLOSE_MS, useNativeDriver: true })
    ]).start(() => {
      onClose(); // RN Modal 즉시 언마운트 (animationType="none")
      setTimeout(() => {
        action();
      }, PICKER_OPEN_DELAY_MS); 
    });
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.bottomSheetOverlay} pointerEvents="box-none">
        {/* JS 애니메이션으로 배경 페이드 처리 */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(46,34,22,0.5)", opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          pointerEvents="auto"
          style={[
            styles.bottomSheet,
            { paddingBottom: insets.bottom + 12, transform: [{ translateY: slideAnim }], zIndex: 10, elevation: 10 },
          ]}
        >
          <View style={styles.bottomSheetHandle} />
          <TouchableOpacity
            style={styles.bottomSheetItem}
            onPress={() => handleAction(onSelectAlbum)}
            activeOpacity={0.7}
          >
            <Text style={styles.bottomSheetItemText}>사진에서 선택</Text>
          </TouchableOpacity>
          <View style={styles.bottomSheetDivider} />
          <TouchableOpacity
            style={styles.bottomSheetItem}
            onPress={() => handleAction(onTakePhoto)}
            activeOpacity={0.7}
          >
            <Text style={styles.bottomSheetItemText}>직접 찍기</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bottomSheetOverlay: { flex: 1, justifyContent: "flex-end" },
  bottomSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12 },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 8,
  },
  bottomSheetItem: { paddingVertical: 18, paddingHorizontal: 24, alignItems: "center" },
  bottomSheetItemText: { fontSize: 16, fontFamily: "Pretendard-Medium", color: Colors.text },
  bottomSheetDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginHorizontal: 24 },
});
