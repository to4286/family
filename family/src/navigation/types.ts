export type OnboardingStackParamList = {
  Onboarding: undefined;
};

export type MainTabParamList = {
  Home: { refresh?: number } | undefined;
  Album: { refresh?: number } | undefined;
  MyPage: { toastText?: string; toastIcon?: string; profileImageUri?: string } | undefined;
};

/** 탭 위에 알림 등 오버레이 화면을 올릴 때 사용하는 스택 */
export type MainTabStackParamList = {
  MainTab: undefined;
  Notifications: undefined;
  AlbumPhotos: {
    folderId: number;
    folderName: string;
    folderCount: number;
    folderMaxCount: number;
    folderCoverColor: string;
    showDeleteToast?: boolean;
  };
  AlbumDetail: {
    photoId: number;
    folderId: number;
    folderName: string;
    folderCount: number;
    folderMaxCount: number;
    folderCoverColor: string;
  };
  ConceptCategories: { memberId: number; memberNickname: string };
  ConceptQuestions: {
    memberId: number;
    memberNickname: string;
    categoryId: number;
    categoryName: string;
    categoryEmoji: string;
  };
  ConceptAnswer: {
    memberId: number;
    memberNickname: string;
    categoryName: string;
    questionId: number;
    questionNumber: number;
    questionText: string;
  };
  NicknameEdit: undefined;
  ProfilePhotoEdit: undefined;
  FamilyTypeEdit: undefined;
};

export type RootStackParamList = {
  OnboardingStack: undefined;
  MainTab: undefined;
  Settings: undefined;
};
