import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from '../utils/supabase';

// 앱이 켜져 있을 때도 알림이 화면에 보이도록 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();

  useEffect(() => {
    // 훅이 실행되면 즉시 권한을 묻고 토큰을 발급받음
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        saveTokenToDatabase(token);
      }
    });
  }, []);

  async function registerForPushNotificationsAsync() {
    let token;

    // 안드로이드는 알림 채널 설정이 필수
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E8955A', // 앱의 accent 컬러 활용
      });
    }

    if (Device.isDevice) {
      // 1. 기존 권한 확인
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // 2. 권한이 없다면 사용자에게 요청 팝업 띄우기
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // 3. 거절했다면 종료
      if (finalStatus !== 'granted') {
        console.log('푸시 알림 권한이 거부되었습니다.');
        return;
      }

      // 4. 승인했다면 엑스포 고유 푸시 토큰 발급
      try {
        token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('📱 내 기기의 푸시 토큰:', token);
      } catch (e) {
        console.error('토큰 발급 오류:', e);
      }
    } else {
      console.log('푸시 알림은 실제 스마트폰에서만 테스트 가능합니다.');
    }

    return token;
  }

  // 발급받은 토큰을 Supabase DB의 members 테이블에 저장
  async function saveTokenToDatabase(token: string) {
    try {
      // 현재 로그인한 유저의 정보 가져오기
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // members 테이블에서 auth_uid가 일치하는 내 계정에 토큰 덮어쓰기
      const { error } = await supabase
        .from('members')
        .update({ push_token: token })
        .eq('auth_uid', user.id);

      if (error) throw error;
      console.log('✅ 토큰 DB 업데이트 성공!');
    } catch (error) {
      console.error('❌ 토큰 DB 저장 실패:', error);
    }
  }

  return { expoPushToken };
}
