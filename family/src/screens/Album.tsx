import React, { useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors } from "../constants/colors";
import type { MainTabStackParamList } from "../navigation/types";

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

const INITIAL_FOLDERS: Folder[] = [
  { id: 1, name: "2024 가족 여행", count: 12, maxCount: 20, coverColor: "#D4B896" },
  { id: 2, name: "일상 기록", count: 8, maxCount: 20, coverColor: "#C9A882" },
  { id: 3, name: "생일 파티 🎂", count: 5, maxCount: 20, coverColor: "#E8C9A0" },
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FOLDER_GAP = 14;
const FOLDER_PADDING = 20;
const FOLDER_SIZE = (SCREEN_WIDTH - FOLDER_PADDING * 2 - FOLDER_GAP) / 2;
/** 홈 화면 헤더(알림 버튼 포함)와 동일한 최소 높이 */
const HEADER_MIN_HEIGHT = 66;

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
  if (!folder) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.menuCard} onStartShouldSetResponder={() => true}>
          <TouchableOpacity style={styles.menuItem} onPress={onRename}>
            <Text style={styles.menuItemText}>✏️ 이름 변경</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={onDelete}>
            <Text style={[styles.menuItemText, { color: "#D4645A" }]}>🗑️ 삭제</Text>
          </TouchableOpacity>
        </View>
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
  const [folders, setFolders] = useState<Folder[]>(INITIAL_FOLDERS);

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [menuFolder, setMenuFolder] = useState<Folder | null>(null);
  const [renameFolder, setRenameFolder] = useState<Folder | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<Folder | null>(null);

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
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>앨범</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.folderGrid}
        showsVerticalScrollIndicator={false}
      >
        {folders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40 }}>🖼️</Text>
            <Text style={styles.emptyText}>아직 앨범이 없어요</Text>
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
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

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
    top: 10,
    right: 10,
    padding: 4,
  },
  folderMenuDots: {
    flexDirection: "row",
    gap: 4,
  },
  folderMenuDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.white,
  },
  folderName: {
    fontSize: 14,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.textHint,
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
  menuCard: {
    width: 200,
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: "hidden",
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.text,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
});
