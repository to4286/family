export type OnboardingStackParamList = {
  Onboarding: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Album: undefined;
  MyPage: undefined;
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
  };
  AlbumDetail: { photoId: number };
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
};

export type RootStackParamList = {
  OnboardingStack: undefined;
  MainTab: undefined;
  Settings: undefined;
};
