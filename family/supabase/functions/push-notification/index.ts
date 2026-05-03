// @ts-ignore
Deno.serve(async (req) => {
  try {
    // 1. 요청 파싱: 토큰 배열, 제목, 내용, 추가 데이터
    const payload = await req.json();
    const { pushTokens, title, body, data } = payload;

    // 방어 로직: 보낼 대상이 없으면 종료
    if (!pushTokens || !Array.isArray(pushTokens) || pushTokens.length === 0) {
      return new Response(
        JSON.stringify({ error: "발송할 푸시 토큰이 존재하지 않습니다." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. 엑스포 푸시 규격에 맞게 메시지 배열 생성
    const messages = pushTokens.map((token) => ({
      to: token,
      sound: "default",
      title: title,
      body: body,
      data: data || {},
    }));

    // 3. 엑스포 푸시 서버로 일괄 발송 요청
    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const receipt = await expoResponse.json();

    // 4. 발송 결과 반환
    return new Response(
      JSON.stringify({ success: true, receipt }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    // 에러 발생 시 처리
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
