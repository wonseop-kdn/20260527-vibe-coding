// ── 결재 규정 엔진 ─────────────────────────────────────────────
const Approval = {

  // 문서 유형 + 금액으로 결재 규정 조회
  async findRule(documentType, amount) {
    const rules = await DB.getApprovalRules();
    const amt = parseInt(amount) || 0;
    return rules.find(r => {
      const typeMatch = r.document_type === documentType ||
                        documentType?.includes(r.document_type) ||
                        r.document_type?.includes(documentType);
      const amtMin = parseInt(r.amount_min) || 0;
      const amtMax = r.amount_max ? parseInt(r.amount_max) : Infinity;
      const amtMatch = amt >= amtMin && amt <= amtMax;
      return typeMatch && amtMatch;
    }) || null;
  },

  // 결재 정보 HTML 렌더링
  renderApprovalBox(step, projectAmount) {
    const approver = step.approver || null;
    const level = step.approval_level || null;
    const audit = step.requires_audit;
    const ref = step.regulation_ref || '';

    if (!approver && !level && !audit && !ref) {
      return `
        <div class="approval-box" style="background:linear-gradient(135deg,#FFFBEB,#FEF3C7);border-color:#FCD34D">
          <div class="approval-item">
            <div class="approval-label">결재 정보</div>
            <div class="approval-value" style="color:#92400E">미설정 — 결재권자를 지정해 주세요</div>
          </div>
          <button class="btn btn-xs btn-secondary" onclick="App.editStepApproval('${step.id}')">결재 설정</button>
        </div>
      `;
    }

    return `
      <div class="approval-box">
        ${approver ? `
          <div class="approval-item">
            <div class="approval-label">결재권자</div>
            <div class="approval-value">${esc(approver)}</div>
          </div>
        ` : ''}
        ${level ? `
          <div class="approval-item">
            <div class="approval-label">결재 단계</div>
            <div class="approval-value">${esc(level)}</div>
          </div>
        ` : ''}
        <div class="approval-item">
          <div class="approval-label">감사 필요</div>
          <div class="approval-value ${audit ? 'red' : 'green'}">${audit ? '✓ 필요' : '불필요'}</div>
        </div>
        ${ref ? `
          <div class="approval-item">
            <div class="approval-label">근거 사규</div>
            <div class="approval-value approval-ref">${esc(ref)}</div>
          </div>
        ` : ''}
        <button class="btn btn-xs btn-secondary" onclick="App.editStepApproval('${step.id}')" style="margin-left:auto">수정</button>
      </div>
    `;
  },

  // 결재 설정 폼 HTML
  editForm(step) {
    return `
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">결재권자</label>
          <input type="text" class="form-input" id="apr-approver" value="${esc(step.approver||'')}" placeholder="예) 부서장, 팀장, 처장">
        </div>
        <div class="form-field">
          <label class="form-label">결재 단계</label>
          <input type="text" class="form-input" id="apr-level" value="${esc(step.approval_level||'')}" placeholder="예) 전결, 합의, 대결">
        </div>
        <div class="form-field full">
          <label class="form-label">
            <input type="checkbox" id="apr-audit" ${step.requires_audit?'checked':''} style="margin-right:6px">
            감사 부서 합의 필요
          </label>
        </div>
        <div class="form-field full">
          <label class="form-label">근거 사규 / 규정</label>
          <input type="text" class="form-input" id="apr-ref" value="${esc(step.regulation_ref||'')}" placeholder="예) 업무규정 제15조 제2항">
        </div>
      </div>
    `;
  },

  // 전체 결재 규정 표에서 자동 설정
  async autoApplyRules(projectId, projectAmount) {
    const steps = await DB.getSteps(projectId);
    const rules = await DB.getApprovalRules();
    let updated = 0;

    for (const step of steps) {
      if (step.approver) continue; // 이미 설정된 것은 스킵
      const rule = await Approval.findRule(step.document_type, projectAmount);
      if (rule) {
        await DB.updateStep(step.id, {
          approver: rule.approver,
          approval_level: rule.approval_level || '',
          requires_audit: rule.requires_audit || false,
          regulation_ref: rule.notes || ''
        });
        updated++;
      }
    }
    return updated;
  }
};
