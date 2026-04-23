import React, { useEffect, useRef } from "react";
import {
  Animated,
  InteractionManager,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/colors";
import { IMAGE_PICKER_OPEN_DELAY_MS } from "../constants/photoPicker";

export const BOTTOM_SHEET_SLIDE_OFFSET = 300;
export const BOTTOM_SHEET_OPEN_MS = 250;
export const BOTTOM_SHEET_CLOSE_MS = 200;

const MODAL_BACKDROP = "rgba(46,34,22,0.5)";
const SHEET_Z = 10;

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

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(BOTTOM_SHEET_SLIDE_OFFSET);
      Animated.timing(slideAnim, { toValue: 0, duration: BOTTOM_SHEET_OPEN_MS, useNativeDriver: true }).start();
    }
  }, [visible, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: BOTTOM_SHEET_SLIDE_OFFSET,
      duration: BOTTOM_SHEET_CLOSE_MS,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handleAction = (action: () => void) => {
    Animated.timing(slideAnim, {
      toValue: BOTTOM_SHEET_SLIDE_OFFSET,
      duration: BOTTOM_SHEET_CLOSE_MS,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      // Modal dismiss·레이아웃이 끝난 뒤에만 피커 present (iOS에서 겹치면 launch가 무시되는 경우 있음)
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          action();
        }, IMAGE_PICKER_OPEN_DELAY_MS);
      });
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.bottomSheetOverlay} pointerEvents="box-none">
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: MODAL_BACKDROP }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          pointerEvents="auto"
          style={[
            styles.bottomSheet,
            {
              paddingBottom: insets.bottom + 12,
              transform: [{ translateY: slideAnim }],
              zIndex: SHEET_Z,
              elevation: SHEET_Z,
            },
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
