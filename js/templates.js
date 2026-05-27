// 기본 사업 프로세스 템플릿
const DEFAULT_TEMPLATES = [
  {
    id: 'tpl_general',
    name: '일반 용역 사업',
    desc: '일반적인 용역 계약 수행 표준 프로세스',
    icon: 'briefcase',
    steps: [
      { id: 's1', name: '계약 체결', category: '계약', offsetDays: 0, required: true, notes: '계약서 서명, 인감 날인 확인' },
      { id: 's2', name: '착수신고서 제출', category: '보고', offsetDays: 7, required: true, notes: '착수신고서 작성 및 제출 (계약일 기준 7일 이내)' },
      { id: 's3', name: '착수보고회 개최', category: '보고', offsetDays: 14, required: true, notes: '과업 수행 계획 발표' },
      { id: 's4', name: '1차 중간보고', category: '보고', offsetDays: null, required: false, notes: '진행 현황 보고 및 방향 확인' },
      { id: 's5', name: '결과보고서 초안 제출', category: '납품', offsetDays: null, required: true, notes: '결과보고서 초안 제출 (검토 기간 확보)' },
      { id: 's6', name: '최종보고회 개최', category: '보고', offsetDays: null, required: true, notes: '최종 결과물 발표' },
      { id: 's7', name: '최종 결과물 납품', category: '납품', offsetDays: null, required: true, notes: '계약서 명시 납품물 일체 제출' },
      { id: 's8', name: '검수 신청', category: '검수', offsetDays: null, required: true, notes: '납품 후 검수 신청서 제출' },
      { id: 's9', name: '검수 완료', category: '검수', offsetDays: null, required: true, notes: '발주처 검수 완료 확인서 수령' },
      { id: 's10', name: '대가 청구서 제출', category: '대금', offsetDays: null, required: true, notes: '세금계산서 및 청구서 제출' },
      { id: 's11', name: '대금 수령 확인', category: '대금', offsetDays: null, required: true, notes: '입금 확인 및 회계 처리' }
    ]
  },
  {
    id: 'tpl_sw',
    name: 'SW 개발 사업',
    desc: '소프트웨어 개발 및 구축 프로젝트 프로세스',
    icon: 'code',
    steps: [
      { id: 's1', name: '계약 체결', category: '계약', offsetDays: 0, required: true, notes: '' },
      { id: 's2', name: '착수신고서 제출', category: '보고', offsetDays: 7, required: true, notes: '' },
      { id: 's3', name: '요구사항 분석서 제출', category: '산출물', offsetDays: 21, required: true, notes: '기능 요구사항, 비기능 요구사항 정의' },
      { id: 's4', name: '시스템 설계서 제출', category: '산출물', offsetDays: null, required: true, notes: 'DB설계, 화면설계, 아키텍처 설계 포함' },
      { id: 's5', name: '개발 착수', category: '개발', offsetDays: null, required: true, notes: '' },
      { id: 's6', name: '단위 테스트 완료', category: '개발', offsetDays: null, required: true, notes: '' },
      { id: 's7', name: '통합 테스트 완료', category: '테스트', offsetDays: null, required: true, notes: '' },
      { id: 's8', name: '사용자 인수 테스트(UAT)', category: '테스트', offsetDays: null, required: true, notes: '' },
      { id: 's9', name: '시스템 구축 완료 보고', category: '보고', offsetDays: null, required: true, notes: '' },
      { id: 's10', name: '최종 산출물 납품', category: '납품', offsetDays: null, required: true, notes: '소스코드, 매뉴얼, 설계문서 일체' },
      { id: 's11', name: '검수 신청 및 완료', category: '검수', offsetDays: null, required: true, notes: '' },
      { id: 's12', name: '유지보수 계획서 제출', category: '산출물', offsetDays: null, required: false, notes: '' },
      { id: 's13', name: '대가 청구서 제출', category: '대금', offsetDays: null, required: true, notes: '' },
      { id: 's14', name: '대금 수령 확인', category: '대금', offsetDays: null, required: true, notes: '' }
    ]
  },
  {
    id: 'tpl_consult',
    name: '컨설팅 사업',
    desc: '경영/기술 컨설팅 및 연구 과제 프로세스',
    icon: 'chart',
    steps: [
      { id: 's1', name: '계약 체결', category: '계약', offsetDays: 0, required: true, notes: '' },
      { id: 's2', name: '착수신고서 제출', category: '보고', offsetDays: 7, required: true, notes: '' },
      { id: 's3', name: '착수보고회', category: '보고', offsetDays: 14, required: true, notes: '과업 수행 계획 및 방법론 발표' },
      { id: 's4', name: 'AS-IS 분석 보고', category: '보고', offsetDays: null, required: true, notes: '현황 조사 및 분석 결과 보고' },
      { id: 's5', name: '중간보고회', category: '보고', offsetDays: null, required: true, notes: 'TO-BE 방향성 및 개선안 발표' },
      { id: 's6', name: '최종보고서 초안 제출', category: '산출물', offsetDays: null, required: true, notes: '' },
      { id: 's7', name: '최종보고회', category: '보고', offsetDays: null, required: true, notes: '' },
      { id: 's8', name: '최종 보고서 납품', category: '납품', offsetDays: null, required: true, notes: '' },
      { id: 's9', name: '검수 완료', category: '검수', offsetDays: null, required: true, notes: '' },
      { id: 's10', name: '대가 청구서 제출', category: '대금', offsetDays: null, required: true, notes: '' },
      { id: 's11', name: '대금 수령 확인', category: '대금', offsetDays: null, required: true, notes: '' }
    ]
  }
];

// 구매규격 → 프로세스 자동 분석
const SpecAnalyzer = {
  // 키워드 → 단계 매핑
  keywords: {
    '착수신고': { name: '착수신고서 제출', category: '보고', priority: 10 },
    '착수보고': { name: '착수보고회 개최', category: '보고', priority: 11 },
    '중간보고': { name: '중간보고회 개최', category: '보고', priority: 50 },
    '최종보고': { name: '최종보고회 개최', category: '보고', priority: 80 },
    '결과보고': { name: '결과보고서 제출', category: '보고', priority: 75 },
    '진도보고': { name: '진도보고', category: '보고', priority: 40 },
    '요구사항': { name: '요구사항 분석서 제출', category: '산출물', priority: 25 },
    '설계서': { name: '시스템 설계서 제출', category: '산출물', priority: 30 },
    '테스트': { name: '테스트 완료', category: '테스트', priority: 60 },
    '시험': { name: '시험 및 검증 완료', category: '테스트', priority: 60 },
    '납품': { name: '최종 결과물 납품', category: '납품', priority: 85 },
    '납품물': { name: '납품물 제출', category: '납품', priority: 85 },
    '검수': { name: '검수 신청 및 완료', category: '검수', priority: 90 },
    '준공': { name: '준공검사', category: '검수', priority: 90 },
    '대가지급': { name: '대가 청구서 제출', category: '대금', priority: 95 },
    '기성': { name: '기성 청구서 제출', category: '대금', priority: 95 },
    '청구': { name: '대가 청구서 제출', category: '대금', priority: 95 },
    '세금계산서': { name: '세금계산서 발행', category: '대금', priority: 96 },
    '하자': { name: '하자보수 보증서 제출', category: '보증', priority: 98 },
    '유지보수': { name: '유지보수 계획 제출', category: '산출물', priority: 82 },
    '교육': { name: '사용자 교육', category: '교육', priority: 78 },
    'SW개발': { name: 'SW 개발 착수', category: '개발', priority: 35 },
    '소프트웨어': { name: '소프트웨어 개발', category: '개발', priority: 35 },
    '구축': { name: '시스템 구축 완료', category: '개발', priority: 70 },
    'DB': { name: 'DB 구축 및 데이터 정제', category: '개발', priority: 45 },
    '데이터': { name: '데이터 정제 및 이관', category: '개발', priority: 45 },
    '분석': { name: '현황 분석 보고', category: '보고', priority: 30 },
  },

  // 사업 유형 감지
  detectType(text) {
    const t = text.toLowerCase();
    if (t.includes('소프트웨어') || t.includes('sw개발') || t.includes('시스템 구축') || t.includes('플랫폼')) return 'tpl_sw';
    if (t.includes('컨설팅') || t.includes('연구') || t.includes('조사') || t.includes('분석 용역')) return 'tpl_consult';
    return 'tpl_general';
  },

  // 기간 추출 (예: "6개월", "180일")
  extractDuration(text) {
    const m = text.match(/(\d+)\s*개월/);
    const d = text.match(/(\d+)\s*일/);
    if (m) return parseInt(m[1]) * 30;
    if (d) return parseInt(d[1]);
    return null;
  },

  // 금액 추출
  extractAmount(text) {
    const m = text.match(/[\d,]+\s*(원|백만원|천만원|억원)/);
    return m ? m[0] : null;
  },

  analyze(specText) {
    const text = specText;
    const type = this.detectType(text);
    const duration = this.extractDuration(text);
    const amount = this.extractAmount(text);

    // 베이스 템플릿
    const baseTemplate = DEFAULT_TEMPLATES.find(t => t.id === type);
    const steps = [...baseTemplate.steps.map(s => ({ ...s, id: DB.uid() }))];

    // 키워드 매칭으로 추가 단계 발견
    const extraSteps = [];
    for (const [keyword, step] of Object.entries(this.keywords)) {
      if (text.includes(keyword)) {
        const exists = steps.some(s => s.name.includes(keyword) || s.name.includes(step.name.slice(0, 4)));
        if (!exists) {
          extraSteps.push({ id: DB.uid(), name: step.name, category: step.category, offsetDays: null, required: false, notes: `구매규격 "${keyword}" 조항에서 추출`, _priority: step.priority });
        }
      }
    }

    // 우선순위 정렬 후 병합
    extraSteps.sort((a, b) => (a._priority || 50) - (b._priority || 50));
    extraSteps.forEach(s => { delete s._priority; });

    return { type, baseTemplate, steps: [...steps, ...extraSteps], duration, amount };
  }
};
