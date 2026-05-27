// ── 구매규격 분석기 ────────────────────────────────────────────
const SpecAnalyzer = {

  // 분석 패턴 정의
  patterns: {
    납기: {
      label: '납기 기간',
      regex: [
        /계약일?\s*(?:로)?부터\s*(\d+)\s*(?:일|개월)\s*(?:이)?내/,
        /납기일?\s*[:：]\s*([^\n,]+)/,
        /준공일?\s*[:：]\s*([^\n,]+)/,
        /(\d+)\s*(?:일|개월)\s*(?:이)?내\s*납품/,
      ]
    },
    착수신고: {
      label: '착수신고 기간',
      regex: [
        /착수신고\s*[:：]?\s*계약일?\s*(?:로)?부터\s*(\d+)\s*일/,
        /계약\s*(?:체결\s*)?후\s*(\d+)\s*일\s*(?:이)?내\s*착수신고/,
        /착수\s*(?:일로부터)?\s*(\d+)\s*일\s*(?:이)?내\s*착수신고/,
      ]
    },
    시운전: {
      label: '시운전 기간',
      regex: [
        /시운전\s*기간\s*[:：]?\s*(\d+)\s*(?:일|개월)/,
        /시운전\s*[:：]?\s*(\d+)\s*(?:일|개월)/,
        /시험\s*운전\s*[:：]?\s*(\d+)\s*(?:일|개월)/,
      ]
    },
    하자보수: {
      label: '하자보수 기간',
      regex: [
        /하자(?:보수)?\s*기간\s*[:：]?\s*(\d+)\s*(?:년|개월|일)/,
        /하자\s*[:：]?\s*(\d+)\s*(?:년|개월|일)/,
        /준공\s*후\s*(\d+)\s*(?:년|개월)\s*(?:간)?\s*하자/,
      ]
    },
    대금지급: {
      label: '대금 지급 조건',
      regex: [
        /대금\s*지급\s*[:：]?\s*([^\n,。]{5,40})/,
        /기성금?\s*지급\s*[:：]?\s*([^\n,。]{5,40})/,
        /준공금\s*[:：]?\s*([^\n,。]{5,40})/,
        /선금\s*[:：]?\s*([^\n,。]{5,40})/,
      ]
    },
    검수기간: {
      label: '검수 기간',
      regex: [
        /검수\s*기간\s*[:：]?\s*(\d+)\s*(?:일|개월)/,
        /납품\s*후\s*(\d+)\s*일\s*(?:이)?내\s*검수/,
        /검수\s*[:：]?\s*납품일?\s*(?:로)?부터\s*(\d+)\s*일/,
      ]
    },
    보증보험: {
      label: '계약 보증',
      regex: [
        /계약(?:이행)?보증(?:금|보험)?\s*[:：]?\s*([^\n,。]{3,30})/,
        /하자(?:이행)?보증(?:금|보험)?\s*[:：]?\s*([^\n,。]{3,30})/,
      ]
    },
    착수보고: {
      label: '착수보고 기간',
      regex: [
        /착수보고\s*[:：]?\s*계약일?\s*(?:로)?부터\s*(\d+)\s*(?:일|개월)/,
        /계약\s*후\s*(\d+)\s*일\s*(?:이)?내\s*착수보고/,
      ]
    },
    중간보고: {
      label: '중간보고',
      regex: [
        /중간보고\s*[:：]?\s*(\d+)\s*회/,
        /중간보고\s*[:：]?\s*([^\n,。]{3,30})/,
        /중간보고서\s*제출\s*[:：]?\s*([^\n,。]{3,30})/,
      ]
    },
    보안요건: {
      label: '보안 요건',
      regex: [
        /보안\s*(?:등급|요건|사항)\s*[:：]?\s*([^\n,。]{3,30})/,
        /비밀유지\s*[:：]?\s*([^\n,。]{3,30})/,
      ]
    }
  },

  // 제출 서류 키워드
  documentKeywords: [
    '착수신고서', '착수계획서', '사업수행계획서', '이행보증서',
    '계약이행보증', '하자이행보증', '보안서약서', '청렴계약서',
    '하도급 계획서', '품질관리계획서', '안전관리계획서',
    '중간보고서', '결과보고서', '준공검사조서', '완료보고서',
    '산출물 목록', '시험성적서', '검사결과보고서', '인수인계서',
    '유지보수 계획서', '사용자 매뉴얼',
  ],

  analyze(text) {
    const results = {};

    // 패턴 매칭
    for (const [key, cfg] of Object.entries(this.patterns)) {
      let found = null;
      for (const re of cfg.regex) {
        const m = text.match(re);
        if (m) { found = m[1]?.trim(); break; }
      }
      results[key] = { label: cfg.label, value: found };
    }

    // 제출 서류 탐지
    const detectedDocs = this.documentKeywords.filter(doc => text.includes(doc));

    // 사업 금액 추출
    const amountMatch = text.match(/(\d[\d,]*)\s*(?:원|백만원|천만원|억원)/);
    const amount = amountMatch ? amountMatch[0] : null;

    // 사업 기간 추출
    const durationMatch = text.match(/(?:사업기간|수행기간|용역기간)\s*[:：]?\s*([^\n,。]{5,40})/);

    // 수행 방법 키워드
    const hasOnsite   = /현장|방문/.test(text);
    const hasRemote   = /원격|비대면/.test(text);
    const hasSecurity = /보안|비밀/.test(text);
    const hasInspect  = /검수|시험|성능/.test(text);

    return {
      extractedFields: results,
      detectedDocuments: detectedDocs,
      amount,
      duration: durationMatch?.[1],
      flags: { hasOnsite, hasRemote, hasSecurity, hasInspect }
    };
  }
};
