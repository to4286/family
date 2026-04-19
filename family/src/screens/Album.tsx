import React, { useCallback, useMemo, useState } from "react";
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
import { Colors } from "../constants/colors";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Folder = {
  id: number;
  name: string;
  count: number;
  maxCount: number;
  coverColor: string;
  coverUri?: string;
};

type Photo = {
  id: number;
  imageUri?: string;
  color: string;
  uploadedAt: string;
  comments: AlbumComment[];
};

type AlbumComment = {
  id: number;
  memberPhotoUri?: string;
  memberNickname: string;
  text: string;
  createdAt: string;
};

type AlbumScreen = "folders" | "photos" | "detail";

// ─── Data ──────────────────────────────────────────────────────────────────────

const FOLDER_COLORS = ["#D4B896", "#C9A882", "#E8C9A0", "#B89878", "#DDBF9A"];

const INITIAL_FOLDERS: Folder[] = [
  { id: 1, name: "2024 가족 여행", count: 12, maxCount: 20, coverColor: "#D4B896" },
  { id: 2, name: "일상 기록", count: 8, maxCount: 20, coverColor: "#C9A882" },
  { id: 3, name: "생일 파티 🎂", count: 5, maxCount: 20, coverColor: "#E8C9A0" },
];

const DUMMY_PHOTOS: Photo[] = [
  { id: 1, color: "#D4B896", uploadedAt: "2일 전", comments: [
    { id: 1, memberPhotoUri: "https://i.pravatar.cc/150?img=47", memberNickname: "이영희", text: "우리 가족 너무 행복해 보여~", createdAt: "2일 전" },
    { id: 2, memberPhotoUri: "https://i.pravatar.cc/150?img=12", memberNickname: "김철수", text: "다음에 또 가자!", createdAt: "1일 전" },
  ]},
  { id: 2, color: "#C9A882", uploadedAt: "3일 전", comments: [] },
  { id: 3, color: "#E8C9A0", uploadedAt: "4일 전", comments: [] },
  { id: 4, color: "#B89878", uploadedAt: "5일 전", comments: [] },
  { id: 5, color: "#DDBF9A", uploadedAt: "6일 전", comments: [] },
  { id: 6, color: "#C4A87E", uploadedAt: "7일 전", comments: [] },
  { id: 7, color: "#E0C8A8", uploadedAt: "8일 전", comments: [] },
  { id: 8, color: "#BFA080", uploadedAt: "9일 전", comments: [] },
  { id: 9, color: "#D8BC94", uploadedAt: "10일 전", comments: [] },
];

const MY_PHOTO_URI = "https://i.pravatar.cc/150?img=33";
const MY_NICKNAME = "민준";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FOLDER_GAP = 14;
const FOLDER_PADDING = 20;
const FOLDER_SIZE = (SCREEN_WIDTH - FOLDER_PADDING * 2 - FOLDER_GAP) / 2;
/** 홈 화면 헤더(알림 버튼 포함)와 동일한 최소 높이 */
const HEADER_MIN_HEIGHT = 66;

// ─── Shared Components ─────────────────────────────────────────────────────────

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.backBtn}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Text style={styles.backBtnText}>{"‹"}</Text>
    </TouchableOpacity>
  );
}

function FloatingActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={onPress}
      activeOpacity={0.85}
    >
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
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
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

// ─── Photo Grid ────────────────────────────────────────────────────────────────

const GRID_GAP = 3;
const GRID_PADDING = 3;
const GRID_COL3 = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

function PhotoGrid({ photos, onPhotoPress }: { photos: Photo[]; onPhotoPress: (photo: Photo) => void }) {
  const rows: React.ReactNode[] = [];
  let i = 0;
  const patterns = [1, 2, 1, 3];
  let patIdx = 0;

  while (i < photos.length) {
    const pat = patterns[patIdx % 4];
    patIdx++;

    if (pat === 1 && i + 2 < photos.length) {
      const p = [photos[i], photos[i + 1], photos[i + 2]];
      rows.push(
        <View key={`r${i}`} style={{ flexDirection: "row", gap: GRID_GAP, marginBottom: GRID_GAP }}>
          {p.map((ph) => (
            <TouchableOpacity key={ph.id} onPress={() => onPhotoPress(ph)} activeOpacity={0.9}
              style={{ width: GRID_COL3, height: GRID_COL3, borderRadius: 4, backgroundColor: ph.color, overflow: "hidden" }}>
              {ph.imageUri && <Image source={{ uri: ph.imageUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />}
            </TouchableOpacity>
          ))}
        </View>
      );
      i += 3;
    } else if (pat === 2 && i + 2 < photos.length) {
      const big = photos[i];
      const sm1 = photos[i + 1];
      const sm2 = photos[i + 2];
      const bigSize = GRID_COL3 * 2 + GRID_GAP;
      rows.push(
        <View key={`r${i}`} style={{ flexDirection: "row", gap: GRID_GAP, marginBottom: GRID_GAP }}>
          <TouchableOpacity onPress={() => onPhotoPress(big)} activeOpacity={0.9}
            style={{ width: bigSize, height: bigSize, borderRadius: 4, backgroundColor: big.color, overflow: "hidden" }}>
            {big.imageUri && <Image source={{ uri: big.imageUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />}
          </TouchableOpacity>
          <View style={{ gap: GRID_GAP }}>
            <TouchableOpacity onPress={() => onPhotoPress(sm1)} activeOpacity={0.9}
              style={{ width: GRID_COL3, height: GRID_COL3, borderRadius: 4, backgroundColor: sm1.color, overflow: "hidden" }}>
              {sm1.imageUri && <Image source={{ uri: sm1.imageUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onPhotoPress(sm2)} activeOpacity={0.9}
              style={{ width: GRID_COL3, height: GRID_COL3, borderRadius: 4, backgroundColor: sm2.color, overflow: "hidden" }}>
              {sm2.imageUri && <Image source={{ uri: sm2.imageUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />}
            </TouchableOpacity>
          </View>
        </View>
      );
      i += 3;
    } else if (pat === 3 && i < photos.length) {
      const ph = photos[i];
      rows.push(
        <TouchableOpacity key={`r${i}`} onPress={() => onPhotoPress(ph)} activeOpacity={0.9}
          style={{ width: "100%", height: 220, borderRadius: 4, backgroundColor: ph.color, marginBottom: GRID_GAP, overflow: "hidden" }}>
          {ph.imageUri && <Image source={{ uri: ph.imageUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />}
        </TouchableOpacity>
      );
      i += 1;
    } else {
      const remaining = photos.slice(i);
      rows.push(
        <View key={`r${i}`} style={{ flexDirection: "row", gap: GRID_GAP, marginBottom: GRID_GAP }}>
          {remaining.map((ph) => (
            <TouchableOpacity key={ph.id} onPress={() => onPhotoPress(ph)} activeOpacity={0.9}
              style={{ width: GRID_COL3, height: GRID_COL3, borderRadius: 4, backgroundColor: ph.color, overflow: "hidden" }}>
              {ph.imageUri && <Image source={{ uri: ph.imageUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />}
            </TouchableOpacity>
          ))}
        </View>
      );
      break;
    }
  }
  return <View style={{ padding: GRID_PADDING }}>{rows}</View>;
}

// ─── Album Comment Sheet ───────────────────────────────────────────────────────

function AlbumCommentSection({ comments, onSubmit }: {
  comments: AlbumComment[];
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const insets = useSafeAreaInsets();

  const handleSend = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText("");
  };

  return (
    <View style={styles.commentSection}>
      <Text style={styles.commentSectionTitle}>댓글 {comments.length}</Text>
      {comments.length === 0 ? (
        <Text style={styles.commentEmpty}>첫 댓글을 남겨보세요 😊</Text>
      ) : (
        comments.map((c) => (
          <View key={c.id} style={styles.commentRow}>
            {c.memberPhotoUri ? (
              <Image source={{ uri: c.memberPhotoUri }} style={styles.commentAvatar} />
            ) : (
              <View style={[styles.commentAvatar, { backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ fontSize: 13, color: Colors.textSub }}>{c.memberNickname.charAt(0)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.commentMeta}>
                <Text style={styles.commentNickname}>{c.memberNickname}</Text>
                <Text style={styles.commentTime}>{c.createdAt}</Text>
              </View>
              <Text style={styles.commentText}>{c.text}</Text>
            </View>
          </View>
        ))
      )}

      <View style={[styles.commentInputRow, { paddingBottom: insets.bottom + 12 }]}>
        <Image source={{ uri: MY_PHOTO_URI }} style={styles.commentMyAvatar} />
        <View style={styles.commentInputWrap}>
          <TextInput
            style={styles.commentInput}
            value={text}
            onChangeText={setText}
            placeholder="댓글을 입력하세요..."
            placeholderTextColor={Colors.textHint}
            maxLength={200}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={styles.commentSendBtn}
            onPress={handleSend}
            disabled={!text.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.commentSendBtnText}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Main Album Screen ─────────────────────────────────────────────────────────

export default function AlbumScreen() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<AlbumScreen>("folders");
  const [folders, setFolders] = useState<Folder[]>(INITIAL_FOLDERS);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>(DUMMY_PHOTOS);

  // Modals
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

  const handleCommentSubmit = (text: string) => {
    if (!selectedPhoto) return;
    const newComment: AlbumComment = {
      id: Date.now(),
      memberPhotoUri: MY_PHOTO_URI,
      memberNickname: MY_NICKNAME,
      text,
      createdAt: "방금 전",
    };
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === selectedPhoto.id ? { ...p, comments: [...p.comments, newComment] } : p
      )
    );
    setSelectedPhoto((prev) =>
      prev ? { ...prev, comments: [...prev.comments, newComment] } : prev
    );
  };

  // ─── Folders Screen ────────────────────────────────────────────────────────

  if (screen === "folders") {
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
                    onPress={() => { setSelectedFolder(folder); setScreen("photos"); }}
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
                  <Text style={styles.folderName} numberOfLines={1}>{folder.name}</Text>
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
          onRename={() => { setRenameFolder(menuFolder); setMenuFolder(null); }}
          onDelete={() => { setDeleteFolder(menuFolder); setMenuFolder(null); }}
        />
        {renameFolder && (
          <RenameModal
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

  // ─── Photos Screen ─────────────────────────────────────────────────────────

  if (screen === "photos" && selectedFolder) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.subHeader}>
          <BackButton onPress={() => setScreen("folders")} />
          <Text style={styles.subHeaderTitle}>{selectedFolder.name}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* 히어로 */}
          <View style={[styles.hero, { backgroundColor: photos[0]?.color || Colors.surface }]}>
            {photos[0]?.imageUri && (
              <Image source={{ uri: photos[0].imageUri }} style={styles.heroImage} resizeMode="cover" />
            )}
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>{selectedFolder.name}</Text>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{selectedFolder.count}/{selectedFolder.maxCount}</Text>
              </View>
            </View>
          </View>

          <PhotoGrid photos={photos} onPhotoPress={(p) => { setSelectedPhoto(p); setScreen("detail"); }} />
        </ScrollView>

        <FloatingActionButton label="+ 사진 추가" onPress={() => {}} />
      </View>
    );
  }

  // ─── Detail Screen ─────────────────────────────────────────────────────────

  if (screen === "detail" && selectedPhoto) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.subHeader}>
          <BackButton onPress={() => setScreen("photos")} />
          <View style={{ flex: 1 }} />
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.detailPhoto, { backgroundColor: selectedPhoto.color }]}>
            {selectedPhoto.imageUri && (
              <Image source={{ uri: selectedPhoto.imageUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            )}
          </View>

          <AlbumCommentSection
            comments={selectedPhoto.comments}
            onSubmit={handleCommentSubmit}
          />
        </ScrollView>
      </View>
    );
  }

  return null;
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
  subHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  subHeaderTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
    textAlign: "center",
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontSize: 32,
    color: Colors.textSub,
    lineHeight: 36,
  },

  // Folder grid
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

  // Empty
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

  // FAB
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

  // Hero
  hero: {
    width: "100%",
    height: 220,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "60%",
    backgroundColor: "transparent",
  },
  heroContent: {
    position: "absolute",
    bottom: 16,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroTitle: {
    fontSize: 18,
    fontFamily: "Pretendard-Medium",
    color: Colors.white,
  },
  heroBadge: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  heroBadgeText: {
    fontSize: 13,
    fontFamily: "Pretendard-Regular",
    color: Colors.white,
  },

  // Detail
  detailPhoto: {
    width: "100%",
    height: 300,
  },

  // Comments
  commentSection: {
    padding: 20,
  },
  commentSectionTitle: {
    fontSize: 15,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
    marginBottom: 14,
  },
  commentEmpty: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.textHint,
    textAlign: "center",
    paddingVertical: 20,
  },
  commentRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  commentNickname: {
    fontSize: 14,
    fontFamily: "Pretendard-Medium",
    color: Colors.text,
  },
  commentTime: {
    fontSize: 12,
    fontFamily: "Pretendard-Regular",
    color: Colors.textHint,
  },
  commentText: {
    fontSize: 15,
    fontFamily: "Pretendard-Regular",
    color: Colors.text,
    lineHeight: 22,
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
  },
  commentMyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 4,
  },
  commentInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: Colors.text,
    maxHeight: 72,
    paddingVertical: 2,
    paddingRight: 4,
  },
  commentSendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  commentSendBtnText: {
    fontSize: 18,
    color: Colors.white,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(46,34,22,0.5)",
    alignItems: "center",
    justifyContent: "center",
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

  // Menu
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
