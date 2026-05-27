// ── 기본 프로세스 템플릿 ───────────────────────────────────────
const DEFAULT_TEMPLATES_DATA = [
  {
    id: 'tpl_default',
    name: '표준 사업 수행 프로세스',
    description: '수주 → 발주 → 청구 전 단계 포함 표준 프로세스',
    is_default: true,
    phases: {
      수주: [
        {
          name: '전력ICT사업 심의회 개최',
          document_type: '심의회 결과보고',
          direction: 'internal',
          category: '심의',
          is_conditional: true,
          condition_desc: '수주 금액 2억 원 이상인 경우에만 진행',
          approver: null, approval_level: null, requires_audit: false,
          regulation_ref: '사규 참조 필요',
          notes: '수주 추진 가능 여부 평가. 수주금액 2억 이상시 필수.'
        },
        {
          name: '수주추진보고서 작성 및 결재',
          document_type: '수주추진보고',
          direction: 'internal',
          category: '보고',
          is_conditional: false,
          approver: null, approval_level: null, requires_audit: false,
          regulation_ref: '사규 참조 필요',
          notes: '고객사 공고를 근거로 수주 추진 가능성 및 계획 보고'
        },
        {
          name: '수주의뢰서 제출 (→ 계약부)',
          document_type: '수주의뢰',
          direction: 'outgoing',
          category: '공문',
          is_conditional: false,
          approver: null, approval_level: null, requires_audit: false,
          regulation_ref: '사규 참조 필요',
          notes: '계약부에 수주의뢰 공문 발송'
        },
        {
          name: '수주체결 알림문서 수령 (← 계약부)',
          document_type: '수주체결 알림',
          direction: 'incoming',
          category: '접수',
          is_conditional: false,
          approver: null, approval_level: null, requires_audit: false,
          regulation_ref: '',
          notes: '계약부로부터 수주체결 알림문서 수령'
        },
        {
          name: '사업시행계획 수립 및 결재',
          document_type: '사업시행계획',
          direction: 'internal',
          category: '보고',
          is_conditional: false,
          approver: null, approval_level: null, requires_audit: false,
          regulation_ref: '사규 참조 필요',
          notes: '수주금액, 예상 발주금액, 투입 인력 MD, 고정비/변동비, 예상 영업이익 포함'
        }
      ],
      발주: [
        {
          name: '발주계획보고서 작성 및 결재',
          document_type: '발주계획보고',
          direction: 'internal',
          category: '보고',
          is_conditional: false,
          approver: null, approval_level: null, requires_audit: false,
          regulation_ref: '사규 참조 필요',
          notes: '발주 계획 및 업체 선정 방법 보고'
        },
        {
          name: '발주의뢰서 제출 (→ 계약부)',
          document_type: '발주의뢰',
          direction: 'outgoing',
          category: '공문',
          is_conditional: true,
          condition_desc: '발주 금액 2,000만 원 초과 시 계약부 경유 필요',
          approver: null, approval_level: null, requires_audit: false,
          regulation_ref: '사규 참조 필요',
          notes: '2,000만 원 이하는 사업부서 직접 계약 가능'
        },
        {
          name: '직접 계약 체결',
          document_type: '직접계약',
          direction: 'internal',
          category: '계약',
          is_conditional: true,
          condition_desc: '발주 금액 2,000만 원 이하인 경우에만 해당',
          approver: null, approval_level: null, requires_audit: false,
          regulation_ref: '사규 참조 필요',
          notes: '사업부서에서 직접 발주 업체와 계약 체결'
        },
        {
          name: '발주체결 알림문서 수령 (← 계약부)',
          document_type: '발주체결 알림',
          direction: 'incoming',
          category: '접수',
          is_conditional: true,
          condition_desc: '발주 금액 2,000만 원 초과 시 (계약부 경유 경우)',
          approver: null, approval_level: null, requires_audit: false,
          regulation_ref: '',
          notes: '계약부로부터 발주체결 알림문서 수령'
        }
      ],
      청구: [
        {
          name: '준공 완료 확인',
          document_type: '준공확인',
          direction: 'internal',
          category: '확인',
          is_conditional: false,
          approver: null, approval_level: null, requires_audit: false,
          regulation_ref: '',
          notes: '업체 납품/시공 완료 여부 확인'
        },
        {
          name: '검수요청 공문 접수 (← 업체)',
          document_type: '검수요청공문',
          direction: 'incoming',
          category: '접수',
          is_conditional: false,
          approver: null, approval_level: null, requires_audit: false,
          regulation_ref: '',
          notes: '업체로부터 검수요청 공문 수령'
        },
        {
          name: '검수 시행 및 결과 확인',
          document_type: '검수결과',
          direction: 'internal',
          category: '검수',
          is_conditional: false,
          approver: null, approval_level: null, requires_audit: false,
          regulation_ref: '사규 참조 필요',
          notes: '현장 검수 및 납품물 확인'
        },
        {
          name: '대가지급 공문 처리 (업체 대금 지급)',
          document_type: '대가지급공문',
          direction: 'internal',
          category: '대금',
          is_conditional: false,
          approver: null, approval_level: null, requires_audit: false,
          regulation_ref: '사규 참조 필요',
          notes: '업체에 대한 대가 지급 처리'
        },
        {
          name: '고객사 대금청구 접수',
          document_type: '대금청구',
          direction: 'outgoing',
          category: '청구',
          is_conditional: false,
          approver: null, approval_level: null, requires_audit: false,
          regulation_ref: '사규 참조 필요',
          notes: '고객사 프로세스에 따라 대금청구 접수'
        },
        {
          name: '매출 처리 (회사 홈페이지 매출 TAB)',
          document_type: '매출처리',
          direction: 'internal',
          category: '회계',
          is_conditional: false,
          approver: null, approval_level: null, requires_audit: false,
          regulation_ref: '사규 참조 필요',
          notes: '회사 홈페이지 매출 TAB에 해당 건 연결 처리'
        },
        {
          name: 'AS충당금 설정',
          document_type: 'AS충당금',
          direction: 'internal',
          category: '회계',
          is_conditional: false,
          approver: null, approval_level: null, requires_audit: false,
          regulation_ref: '사규 참조 필요',
          notes: 'AS 충당금 설정 및 처리'
        }
      ]
    }
  }
];

// ── 공문 방향 레이블 ──
const DIRECTION_LABEL = { outgoing: '발신 →', incoming: '수신 ←', internal: '내부' };
const DIRECTION_CLASS = { outgoing: 'dir-out', incoming: 'dir-in', internal: 'dir-int' };

// ── 단계 상태 분류 ──
const PHASE_COLORS = { 수주: 'blue', 발주: 'green', 청구: 'amber' };
