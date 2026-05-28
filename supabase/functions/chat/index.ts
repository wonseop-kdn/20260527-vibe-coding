const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { messages, regulationsContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages 배열이 필요합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY가 설정되지 않았습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt = `당신은 KDN(한국전력공사 자회사) 사업관리 전문가 AI 어시스턴트입니다.
사업관리 규정, 예산 집행, 계약 절차, 프로젝트 관리 등에 대해 정확하고 실무적인 답변을 제공합니다.
항상 한국어로 답변하며, 관련 규정이나 근거를 함께 안내해 주세요.
답변은 명확하고 구체적으로, 실무자가 바로 활용할 수 있도록 작성해 주세요.`;

    if (regulationsContext && regulationsContext.trim().length > 0) {
      systemPrompt += `\n\n아래는 현재 등록된 사업관리 규정 내용입니다. 질문에 답변할 때 이 내용을 우선적으로 참고하세요:\n\n${regulationsContext}`;
    }

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: openaiMessages,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("OpenAI API error:", errText);
      return new Response(
        JSON.stringify({ error: "OpenAI API 호출에 실패했습니다." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const assistantMessage = data.choices?.[0]?.message?.content ?? "응답을 생성하는 데 실패했습니다.";

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        usage: data.usage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
