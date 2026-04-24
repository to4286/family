import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors } from "../constants/colors";
import type { MainTabParamList, MainTabStackParamList } from "../navigation/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Folder = {
  id: number;
  name: string;
  count: number;
  maxCount: number;
  coverColor: string;
  coverUri?: string;
};

// ─── Data ──────────────────────────────────────────────────────────────────────

const FOLDER_COLORS = ["#D4B896", "#C9A882", "#E8C9A0", "#B89878", "#DDBF9A"];

const INITIAL_FOLDERS: Folder[] = [];

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FOLDER_GAP = 14;
const FOLDER_PADDING = 20;
const FOLDER_SIZE = (SCREEN_WIDTH - FOLDER_PADDING * 2 - FOLDER_GAP) / 2;
const HEADER_MIN_HEIGHT = 66;

const FOLDER_MENU_BTN_SIZE = 32;
const FOLDER_MENU_BTN_OFFSET = 12;
const FOLDER_MENU_BTN_OVERLAY = "rgba(0,0,0,0.3)";
const FOLDER_MENU_DOT_GAP = 3;
const FOLDER_MENU_DOT_SIZE = 4;

const BOTTOM_SHEET_SLIDE_OFFSET = 300;
const BOTTOM_SHEET_OPEN_MS = 250;
const BOTTOM_SHEET_CLOSE_MS = 200;

// ─── Shared Components ─────────────────────────────────────────────────────────

function FloatingActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.fabText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── New Folder Modal ──────────────────────────────────────────────────────────

function NewFolderModal({ visible, onClose, onCreate }: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");

  // 모달이 닫힐 때 입력 필드 초기화
  useEffect(() => {
    if (!visible) {
      setName("");
    }
  }, [visible]);

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim());
    setName("");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>새 앨범 만들기</Text>
          <TextInput
            style={[styles.modalInput, name ? { borderColor: Colors.accent } : {}]}
            value={name}
            onChangeText={setName}
            placeholder="앨범 이름을 입력해주세요"
            placeholderTextColor={Colors.textHint}
            autoFocus
            maxLength={20}
          />
          <TouchableOpacity
            style={[styles.modalCreateBtn, !name.trim() && { backgroundColor: Colors.border }]}
            onPress={handleCreate}
            disabled={!name.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.modalCreateBtnText}>만들기</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Folder Menu Modal ─────────────────────────────────────────────────────────

function FolderMenuModal({ visible, folder, onClose, onRename, onDelete }: {
  visible: boolean;
  folder: Folder | null;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(BOTTOM_SHEET_SLIDE_OFFSET)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(BOTTOM_SHEET_SLIDE_OFFSET);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: BOTTOM_SHEET_OPEN_MS,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: BOTTOM_SHEET_SLIDE_OFFSET,
      duration: BOTTOM_SHEET_CLOSE_MS,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  if (!folder) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.bottomSheetOverlay} activeOpacity={1} onPress={handleClose}>
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              paddingBottom: insets.bottom + 12,
              transform: [{ translateY: slideAnim }],
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.bottomSheetHandle} />
          <TouchableOpacity style={styles.bottomSheetItem} onPress={onRename} activeOpacity={0.7}>
            <Text style={styles.bottomSheetItemText}>이름 변경</Text>
          </TouchableOpacity>
          <View style={styles.bottomSheetDivider} />
          <TouchableOpacity style={styles.bottomSheetItem} onPress={onDelete} activeOpacity={0.7}>
            <Text style={[styles.bottomSheetItemText, styles.bottomSheetItemTextDestructive]}>삭제하기</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Rename Modal ──────────────────────────────────────────────────────────────

function RenameModal({ visible, initialName, onClose, onRename }: {
  visible: boolean;
  initialName: string;
  onClose: () => void;
  onRename: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
          <Text style={styles.modalTitle}>이름 변경</Text>
          <TextInput
            style={[styles.modalInput, name ? { borderColor: Colors.accent } : {}]}
            value={name}
            onChangeText={setName}
            autoFocus
            maxLength={20}
          />
          <View style={styles.modalBtnRow}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalCreateBtn, { flex: 1 }, !name.trim() && { backgroundColor: Colors.border }]}
              onPress={() => name.trim() && onRename(name.trim())}
              disabled={!name.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCreateBtnText}>완료</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteConfirmModal({ visible, onClose, onDelete }: {
  visible: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
          <Text style={styles.modalTitle}>앨범을 삭제할까요?</Text>
          <Text style={styles.modalDesc}>앨범 안에 있는 사진이{"\n"}모두 삭제되며 복구할 수 없어요</Text>
          <View style={styles.modalBtnRow}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalCreateBtn, { flex: 1, backgroundColor: "#D4645A" }]}
              onPress={onDelete}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCreateBtnText}>삭제하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Main Album Screen ─────────────────────────────────────────────────────────

export default function AlbumScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainTabStackParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, "Album">>();
  const scrollRef = useRef<ScrollView>(null);
  const [folders, setFolders] = useState<Folder[]>(INITIAL_FOLDERS);

  useEffect(() => {
    const refresh = route.params?.refresh;
    if (refresh === undefined) return;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    console.log("새로운 가족 데이터를 불러옵니다...");
    setFolders(INITIAL_FOLDERS.map((f) => ({ ...f })));
  }, [route.params?.refresh]);

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [menuFolder, setMenuFolder] = useState<Folder | null>(null);
  const [renameFolder, setRenameFolder] = useState<Folder | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<Folder | null>(null);

  const [showToast, setShowToast] = useState(false);
  const [toastContent, setToastContent] = useState({ icon: "", text: "" });
  const toastAnim = useRef(new Animated.Value(300)).current;

  const triggerToast = (icon: string, text: string) => {
    setToastContent({ icon, text });
    setShowToast(true);
    Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 300, duration: 300, useNativeDriver: true }).start(() =>
        setShowToast(false)
      );
    }, 1500);
  };

  const handleCreateFolder = (name: string) => {
    setFolders((prev) => [
      ...prev,
      {
        id: Date.now(),
        name,
        count: 0,
        maxCount: 20,
        coverColor: FOLDER_COLORS[prev.length % FOLDER_COLORS.length],
      },
    ]);
    setShowNewFolder(false);
    triggerToast("✅", "새 앨범이 만들어졌어요");
  };

  const handleRename = (name: string) => {
    if (!renameFolder) return;
    setFolders((prev) => prev.map((f) => (f.id === renameFolder.id ? { ...f, name } : f)));
    setRenameFolder(null);
  };

  const handleDelete = () => {
    if (!deleteFolder) return;
    setFolders((prev) => prev.filter((f) => f.id !== deleteFolder.id));
    setDeleteFolder(null);
    triggerToast("🗑️", "앨범이 삭제되었어요");
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>앨범</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.folderGrid, folders.length === 0 && styles.folderGridEmpty]}
        showsVerticalScrollIndicator={false}
      >
        {folders.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyTextBlock}>
              <Text style={styles.emptyText}>아직 앨범이 없어요</Text>
              <Text style={styles.emptyText}>가족과 함께한 추억을 등록해보세요</Text>
            </View>
            <TouchableOpacity
              style={styles.emptyCreateBtn}
              activeOpacity={0.8}
              onPress={() => setShowNewFolder(true)}
            >
              <Text style={styles.emptyCreateBtnText}>앨범 만들기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.folderRow}>
            {folders.map((folder) => (
              <View key={folder.id} style={styles.folderItem}>
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate("AlbumPhotos", {
                      folderId: folder.id,
                      folderName: folder.name,
                      folderCount: folder.count,
                      folderMaxCount: folder.maxCount,
                      folderCoverColor: folder.coverColor,
                    });
                  }}
                  activeOpacity={0.9}
                  style={[styles.folderCover, { backgroundColor: folder.coverColor }]}
                >
                  {folder.coverUri && (
                    <Image source={{ uri: folder.coverUri }} style={styles.folderCoverImage} resizeMode="cover" />
                  )}
                  <TouchableOpacity
                    style={styles.folderMenuBtn}
                    onPress={() => setMenuFolder(folder)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.folderMenuDots}>
                      {[0, 1, 2].map((i) => (
                        <View key={i} style={styles.folderMenuDot} />
                      ))}
                    </View>
                  </TouchableOpacity>
                </TouchableOpacity>
                <Text style={styles.folderName} numberOfLines={1}>
                  {folder.name}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <FloatingActionButton label="+ 새 앨범" onPress={() => setShowNewFolder(true)} />

      <NewFolderModal
        visible={showNewFolder}
        onClose={() => setShowNewFolder(false)}
        onCreate={handleCreateFolder}
      />
      <FolderMenuModal
        visible={!!menuFolder}
        folder={menuFolder}
        onClose={() => setMenuFolder(null)}
        onRename={() => {
          setRenameFolder(menuFolder);
          setMenuFolder(null);
        }}
        onDelete={() => {
          setDeleteFolder(menuFolder);
          setMenuFolder(null);
        }}
      />
      {renameFolder && (
        <RenameModal
          key={renameFolder.id}
          visible
          initialName={renameFolder.name}
          onClose={() => setRenameFolder(null)}
          onRename={handleRename}
        />
      )}
      <DeleteConfirmModal
        visible={!!deleteFolder}
        onClose={() => setDeleteFolder(null)}
        onDelete={handleDelete}
      />
      {showToast && (
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnim }] }]}>
          <Text style={styles.toastIcon}>{toastContent.icon}</Text>
          <Text style={styles.toastText}>{toastContent.text}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
    minHeight: HEADER_MIN_HEIGHT,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "NanumSquareRound-ExtraBold",
    color: Colors.text,
  },
  folderGrid: {
    padding: FOLDER_PADDING,
    paddingBottom: 120,
  },
  folderGridEmpty: {
    flexGrow: 1,
  },
  folderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: FOLDER_GAP,
  },
  folderItem: {
    width: FOLDER_SIZE,
    marginBottom: 8,
  },
  folderCover: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 8,
  },
  folderCoverImage: {
    width: "100%",
    height: "100%",
  },
  folderMenuBtn: {
    position: "absolute",
    top: FOLDER_MENU_BTN_OFFSET,
    right: FOLDER_MENU_BTN_OFFSET,
    width: FOLDER_MENU_BTN_SIZE,
    height: FOLDER_MENU_BTN_SIZE,
    borderRadius: FOLDER_MENU_BTN_SIZE / 2,
    backgroundColor: FOLDER_MENU_BTN_OVERLAY,
    alignItems: "center",
    justifyContent: "center",
  },
  folderMenuDots: {
    flexDirection: "row",
    gap: FOLDER_MENU_DOT_GAP,
  },
  folderMenuDot: {
    width: FOLDER_MENU_DOT_SIZE,
    height: FOLDER_MENU_DOT_SIZE,
    borderRadius: FOLDER_MENU_DOT_SIZE / 2,
    backgroundColor: Colors.white,
  },
  folderName: {
    fontSize: 14,
    fontFamily: "NanumSquareRound-Bold",
    color: Colors.text,
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 200,
  },
  emptyTextBlock: {
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "NanumSquareRound-Regular",
    color: Colors.textSub,
    textAlign: "center",
  },
  emptyCreateBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: Colors.accent,
  },
  emptyCreateBtnText: {
    fontSize: 13,
    fontFamily: "Pretendard-Medium",
    color: Colors.white,
  },
  fab: {
    position: "absolute",
    bottom: 120,
    right: 24,
    backgroundColor: Colors.accent,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: "#5A3E1B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    fontSize: 14,
    fontFamily: "Pretendard-Medium",
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(46,34,22,0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 120,
  },
  modalCard: {
    width: 300,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    paddingTop: 28,
  },
  modalCloseBtn: {
    position: "absolute",
    top: 14,
    right: 16,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseBtnText: {
    fontSize: 18,
    color: Colors.textSub,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 20,
  },
  modalDesc: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.textSub,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalInput: {
    width: "100%",
    padding: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.bg,
    fontSize: 15,
    fontFamily: "Pretendard-Regular",
    color: Colors.text,
    marginBottom: 20,
  },
  modalCreateBtn: {
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCreateBtnText: {
    fontSize: 15,
    fontFamily: "Pretendard-Medium",
    color: Colors.white,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.text,
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(46,34,22,0.5)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 8,
  },
  bottomSheetItem: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  bottomSheetItemText: {
    fontSize: 16,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
  },
  bottomSheetItemTextDestructive: {
    color: "#D4645A",
  },
  bottomSheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginHorizontal: 24,
  },
  toastContainer: {
    position: "absolute",
    bottom: 130, // 플로팅 버튼(FAB) 위쪽으로 올라오도록 여유 있게 설정
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: "rgba(46, 34, 22, 0.85)",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 14,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  toastIcon: {
    fontSize: 20,
  },
  toastText: {
    fontSize: 16,
    fontFamily: "Pretendard-Medium",
    color: "#FFFFFF",
  },
});