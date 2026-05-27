import Anthropic from "npm:@anthropic-ai/sdk@0.27.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // CORS preflight
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

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = new Anthropic({ apiKey });

    // 시스템 프롬프트 구성
    let systemPrompt = `당신은 KDN(한국전력공사 자회사) 사업관리 전문가 AI 어시스턴트입니다.
사업관리 규정, 예산 집행, 계약 절차, 프로젝트 관리 등에 대해 정확하고 실무적인 답변을 제공합니다.
항상 한국어로 답변하며, 관련 규정이나 근거를 함께 안내해 주세요.
답변은 명확하고 구체적으로, 실무자가 바로 활용할 수 있도록 작성해 주세요.`;

    if (regulationsContext && regulationsContext.trim().length > 0) {
      systemPrompt += `\n\n아래는 현재 등록된 사업관리 규정 내용입니다. 질문에 답변할 때 이 내용을 우선적으로 참고하세요:\n\n${regulationsContext}`;
    }

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    });

    const assistantMessage = response.content[0]?.type === "text"
      ? response.content[0].text
      : "응답을 생성하는 데 실패했습니다.";

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        usage: response.usage,
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
