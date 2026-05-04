// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 표준 Base64 디코딩 (URL safe Base64도 처리)
function decodeStateBase64(s: string): string {
  let normalized = s.replace(/-/g, "+").replace(/_/g, "/");
  while (normalized.length % 4 !== 0) normalized += "=";
  return atob(normalized);
}

function buildErrorRedirect(appRedirectUri: string, message: string): Response {
  const url = `${appRedirectUri}${appRedirectUri.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`;
  return new Response(null, { status: 302, headers: { Location: url } });
}

// @ts-ignore
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  // state는 base64(JSON({ csrfToken, appRedirectUri }))
  let appRedirectUri: string | undefined;
  let csrfToken: string | undefined;
  if (state) {
    try {
      const decoded = JSON.parse(decodeStateBase64(state));
      appRedirectUri = decoded.appRedirectUri;
      csrfToken = decoded.csrfToken;
    } catch {
      // state 디코딩 실패 — 잘못된 요청
    }
  }

  if (!appRedirectUri) {
    return new Response(
      JSON.stringify({ error: "잘못된 state" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (errorParam) {
    return buildErrorRedirect(appRedirectUri, errorParam);
  }

  if (!code) {
    return buildErrorRedirect(appRedirectUri, "code가 없습니다.");
  }

  try {
    // @ts-ignore
    const naverClientId = Deno.env.get("NAVER_CLIENT_ID");
    // @ts-ignore
    const naverClientSecret = Deno.env.get("NAVER_CLIENT_SECRET");
    if (!naverClientId || !naverClientSecret) {
      return buildErrorRedirect(appRedirectUri, "Naver 환경변수 미등록");
    }

    // 1. code → access_token 교환
    const tokenUrl =
      `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code` +
      `&client_id=${encodeURIComponent(naverClientId)}` +
      `&client_secret=${encodeURIComponent(naverClientSecret)}` +
      `&code=${encodeURIComponent(code)}` +
      `&state=${encodeURIComponent(state ?? "")}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return buildErrorRedirect(
        appRedirectUri,
        `네이버 토큰 발급 실패: ${tokenData.error_description ?? tokenData.error ?? "unknown"}`
      );
    }

    // 2. 네이버 사용자 정보 조회
    const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileRes.json();

    if (profileData.resultcode !== "00") {
      return buildErrorRedirect(
        appRedirectUri,
        `사용자 정보 조회 실패: ${profileData.message}`
      );
    }

    const naverUser = profileData.response;
    const naverId: string = naverUser.id;
    const email: string | undefined = naverUser.email;
    const name: string | undefined = naverUser.name;
    const profileImage: string | null = naverUser.profile_image ?? null;

    if (!email) {
      return buildErrorRedirect(appRedirectUri, "이메일 정보가 없습니다.");
    }

    // 3. Supabase 사용자 생성/조회
    // @ts-ignore
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    // @ts-ignore
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: listData, error: listError } =
      await admin.auth.admin.listUsers();
    if (listError) throw listError;

    const existing = listData.users.find((u: any) => u.email === email);
    let userId: string;

    if (existing) {
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...(existing.user_metadata || {}),
          naver_id: naverId,
          name: name ?? existing.user_metadata?.name,
          profile_image: profileImage ?? existing.user_metadata?.profile_image,
          provider: "naver",
        },
      });
    } else {
      const { data: createData, error: createError } =
        await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            naver_id: naverId,
            name,
            profile_image: profileImage,
            provider: "naver",
          },
        });
      if (createError) throw createError;
      userId = createData.user.id;
    }

    // 4. Magic link 발행
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
    if (linkError) throw linkError;

    // 5. deep link로 앱에 redirect (tokenHash, csrfToken 전달)
    const tokenHash = linkData.properties.hashed_token;
    const successUrl =
      `${appRedirectUri}${appRedirectUri.includes("?") ? "&" : "?"}` +
      `tokenHash=${encodeURIComponent(tokenHash)}` +
      `&csrf=${encodeURIComponent(csrfToken ?? "")}`;

    return new Response(null, {
      status: 302,
      headers: { Location: successUrl },
    });
  } catch (error: any) {
    return buildErrorRedirect(
      appRedirectUri,
      error.message ?? "알 수 없는 오류"
    );
  }
});
