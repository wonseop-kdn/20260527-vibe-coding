// KDN 사업관리 시스템 - Chatbot Module
// Depends on: window.SUPABASE_URL, window.supabase (supabase-js client), window.esc()

window.Chatbot = (() => {
  // ----------------------------------------------------------------
  // State
  // ----------------------------------------------------------------
  let isOpen = false;
  let messages = []; // { role: 'user'|'assistant', content: string }

  // ----------------------------------------------------------------
  // init: DOM 이벤트 바인딩
  // ----------------------------------------------------------------
  function init() {
    const fab     = document.getElementById('chatbot-fab');
    const closeBtn = document.getElementById('chatbot-close');
    const sendBtn  = document.getElementById('chatbot-send');
    const input    = document.getElementById('chatbot-input');

    if (fab)      fab.addEventListener('click', toggle);
    if (closeBtn) closeBtn.addEventListener('click', toggle);
    if (sendBtn)  sendBtn.addEventListener('click', send);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          send();
        }
      });
    }

    // 환영 메시지
    addMessage('assistant', '안녕하세요! KDN 사업관리 AI 어시스턴트입니다. 사업관리 규정, 예산 집행, 계약 절차 등 궁금한 점을 질문해 주세요.');
  }

  // ----------------------------------------------------------------
  // toggle: 챗봇 패널 열기/닫기
  // ----------------------------------------------------------------
  function toggle() {
    const panel = document.getElementById('chatbot-panel');
    if (!panel) return;

    isOpen = !isOpen;
    panel.style.display = isOpen ? 'flex' : 'none';

    if (isOpen) {
      const input = document.getElementById('chatbot-input');
      if (input) input.focus();
      scrollToBottom();
    }
  }

  // ----------------------------------------------------------------
  // send: 입력창 값을 읽어 chat() 호출
  // ----------------------------------------------------------------
  function send() {
    const input = document.getElementById('chatbot-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    chat(text);
  }

  // ----------------------------------------------------------------
  // chat: 메시지 전송 및 응답 처리
  // ----------------------------------------------------------------
  async function chat(userMessage) {
    // 1. 사용자 메시지 UI 추가 및 히스토리 저장
    addMessage('user', userMessage);
    messages.push({ role: 'user', content: userMessage });

    // 2. 타이핑 인디케이터 표시
    const typingId = showTyping();

    let assistantText = '';

    try {
      const supabaseUrl = window.SUPABASE_URL || '';

      if (supabaseUrl) {
        // 3a. Supabase Edge Function 호출
        const regulationsContext = await getRegulationsContext();

        const res = await fetch(`${supabaseUrl}/functions/v1/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messages.slice(-10), // 최근 10개 메시지만 전송
            regulationsContext,
          }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        assistantText = data.message || '응답을 받지 못했습니다.';
      } else {
        throw new Error('SUPABASE_URL not configured');
      }
    } catch (err) {
      console.warn('[Chatbot] Edge function failed, falling back to local search:', err);

      // 3b. 로컬 규정 검색으로 대체
      try {
        const regs = await fetchAllRegulations();
        assistantText = searchLocal(userMessage, regs);
      } catch (localErr) {
        console.error('[Chatbot] Local search failed:', localErr);
        assistantText = '죄송합니다. 현재 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
      }
    } finally {
      removeTyping(typingId);
    }

    // 4. 응답 메시지 UI 추가 및 히스토리 저장
    addMessage('assistant', assistantText);
    messages.push({ role: 'assistant', content: assistantText });

    // 히스토리가 너무 길어지면 앞부분 제거 (환영 메시지 제외)
    if (messages.length > 40) {
      messages = messages.slice(-40);
    }
  }

  // ----------------------------------------------------------------
  // addMessage: 채팅창에 메시지 버블 추가
  // ----------------------------------------------------------------
  function addMessage(role, content) {
    const container = document.getElementById('chatbot-messages');
    if (!container) return;

    const isUser = role === 'user';
    const wrapper = document.createElement('div');
    wrapper.className = `chatbot-msg chatbot-msg--${isUser ? 'user' : 'assistant'}`;
    wrapper.style.cssText = [
      'display:flex',
      `justify-content:${isUser ? 'flex-end' : 'flex-start'}`,
      'margin-bottom:10px',
    ].join(';');

    const bubble = document.createElement('div');
    bubble.style.cssText = [
      `background:${isUser ? '#2563EB' : '#1E293B'}`,
      `color:${isUser ? '#fff' : '#E2E8F0'}`,
      'border-radius:12px',
      `border-bottom-${isUser ? 'right' : 'left'}-radius:2px`,
      'padding:10px 14px',
      'max-width:80%',
      'font-size:14px',
      'line-height:1.6',
      'white-space:pre-wrap',
      'word-break:break-word',
    ].join(';');

    // esc()는 app.js에 전역으로 정의되어 있음
    bubble.innerHTML = typeof esc === 'function'
      ? esc(content).replace(/\n/g, '<br>')
      : content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

    wrapper.appendChild(bubble);
    container.appendChild(wrapper);
    scrollToBottom();
  }

  // ----------------------------------------------------------------
  // showTyping / removeTyping: 타이핑 인디케이터
  // ----------------------------------------------------------------
  function showTyping() {
    const container = document.getElementById('chatbot-messages');
    if (!container) return null;

    const id = 'typing-' + Date.now();
    const wrapper = document.createElement('div');
    wrapper.id = id;
    wrapper.style.cssText = 'display:flex;justify-content:flex-start;margin-bottom:10px;';

    const bubble = document.createElement('div');
    bubble.style.cssText = [
      'background:#1E293B',
      'color:#94A3B8',
      'border-radius:12px',
      'border-bottom-left-radius:2px',
      'padding:10px 16px',
      'font-size:20px',
      'letter-spacing:2px',
    ].join(';');
    bubble.textContent = '···';

    wrapper.appendChild(bubble);
    container.appendChild(wrapper);
    scrollToBottom();
    return id;
  }

  function removeTyping(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  // ----------------------------------------------------------------
  // scrollToBottom: 채팅창 스크롤 맨 아래로
  // ----------------------------------------------------------------
  function scrollToBottom() {
    const container = document.getElementById('chatbot-messages');
    if (container) container.scrollTop = container.scrollHeight;
  }

  // ----------------------------------------------------------------
  // getRegulationsContext: DB에서 규정 목록 가져와 텍스트로 반환
  // ----------------------------------------------------------------
  async function getRegulationsContext() {
    try {
      const regs = await fetchAllRegulations();
      if (!regs || regs.length === 0) return '';

      let context = regs
        .map((r) => `[${r.category || '규정'}] ${r.title}\n${r.content || ''}`)
        .join('\n\n');

      // 최대 3000자 제한
      if (context.length > 3000) {
        context = context.substring(0, 3000) + '\n...(이하 생략)';
      }
      return context;
    } catch (err) {
      console.warn('[Chatbot] getRegulationsContext failed:', err);
      return '';
    }
  }

  // ----------------------------------------------------------------
  // fetchAllRegulations: supabase 클라이언트로 regulations 조회
  // ----------------------------------------------------------------
  async function fetchAllRegulations() {
    if (!window.supabase) return [];
    const { data, error } = await window.supabase
      .from('regulations')
      .select('title, content, category')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  }

  // ----------------------------------------------------------------
  // searchLocal: 키워드 기반 로컬 규정 검색 (폴백)
  // ----------------------------------------------------------------
  function searchLocal(question, regulations) {
    if (!regulations || regulations.length === 0) {
      return '등록된 규정 데이터가 없습니다. 관리자에게 규정 등록을 요청해 주세요.';
    }

    const keywords = question
      .replace(/[?？!！.,，。]/g, ' ')
      .split(/\s+/)
      .filter((k) => k.length >= 2);

    if (keywords.length === 0) {
      return '질문을 좀 더 구체적으로 입력해 주세요. (예: "계약 절차", "예산 집행 기준")';
    }

    // 각 규정의 점수 계산
    const scored = regulations.map((reg) => {
      const text = `${reg.title || ''} ${reg.content || ''} ${reg.category || ''}`.toLowerCase();
      const score = keywords.reduce((acc, kw) => {
        const count = (text.match(new RegExp(kw.toLowerCase(), 'g')) || []).length;
        return acc + count;
      }, 0);
      return { reg, score };
    });

    const matched = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (matched.length === 0) {
      return `"${question}"에 관련된 규정을 찾지 못했습니다.\n\n더 구체적인 키워드로 다시 질문하시거나, 담당자에게 문의해 주세요.`;
    }

    const snippets = matched.map(({ reg }) => {
      const content = reg.content || '';
      const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;
      return `▪ [${reg.category || '규정'}] ${reg.title}\n${preview}`;
    });

    return `관련 규정을 찾았습니다:\n\n${snippets.join('\n\n')}\n\n더 자세한 내용은 규정 관리 메뉴에서 확인하세요.`;
  }

  // ----------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------
  return {
    get isOpen() { return isOpen; },
    get messages() { return messages; },
    init,
    toggle,
    send,
    chat,
    addMessage,
    getRegulationsContext,
    searchLocal,
  };
})();
