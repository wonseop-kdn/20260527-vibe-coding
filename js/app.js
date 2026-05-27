// ── Utility ───────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return String(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}
function fmtAmt(n) {
  if (!n) return '';
  return Number(n).toLocaleString('ko-KR');
}
function daysDiff(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const t = new Date(); t.setHours(0,0,0,0);
  return Math.round((d - t) / 86400000);
}
function duePill(step) {
  if (step.done) return `<span class="tl-due done-sty">완료</span>`;
  if (!step.due_date) return `<span class="tl-due nodate">날짜 미정</span>`;
  const diff = daysDiff(step.due_date);
  if (diff < 0)  return `<span class="tl-due overdue">${Math.abs(diff)}일 초과</span>`;
  if (diff === 0) return `<span class="tl-due overdue">오늘 마감</span>`;
  if (diff <= 3)  return `<span class="tl-due soon">D-${diff}</span>`;
  return `<span class="tl-due normal">${fmtDate(step.due_date)}</span>`;
}

// ── Toast ─────────────────────────────────────────────────────
const Toast = {
  show(title, msg = '', type = 'primary') {
    const icons = { primary: 'ℹ️', success: '✅', warning: '⚠️', danger: '🚨' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-ico">${icons[type]||'ℹ️'}</span>
      <div class="toast-content"><div class="toast-title">${esc(title)}</div><div class="toast-msg">${esc(msg)}</div></div>`;
    document.getElementById('toast-stack').appendChild(el);
    setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(20px)'; setTimeout(()=>el.remove(),300); }, 3500);
  }
};

// ── Modal ─────────────────────────────────────────────────────
const Modal = {
  open(title, body, size = '') {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-box').className = `modal-box ${size}`;
    document.getElementById('modal-backdrop').style.display = 'flex';
  },
  close() { document.getElementById('modal-backdrop').style.display = 'none'; },
};

// ── Main App ──────────────────────────────────────────────────
const App = {
  page: 'dashboard',
  projectCache: {},
  stepsCache: {},

  async init() {
    initDB();
    this.bindNav();
    this.bindModal();
    document.getElementById('btn-new-project').addEventListener('click', () => App.showNewProjectModal());
    document.getElementById('sidebar-toggle').addEventListener('click', () => App.toggleSidebar());
    document.getElementById('notif-btn').addEventListener('click', () => App.navigate('settings'));
    await this.navigate('dashboard');
    this.updateNavCounts();
    this.checkAlerts();
  },

  toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const main = document.getElementById('main-area');
    const isMobile = window.innerWidth < 900;
    if (isMobile) {
      sb.classList.toggle('mobile-open');
    } else {
      sb.classList.toggle('collapsed');
      main.classList.toggle('expanded');
    }
  },

  bindNav() {
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); App.navigate(el.dataset.page); });
    });
  },

  bindModal() {
    document.getElementById('modal-close').addEventListener('click', Modal.close);
    document.getElementById('modal-backdrop').addEventListener('click', e => { if (e.target === e.currentTarget) Modal.close(); });
  },

  async navigate(page, param) {
    this.page = page;
    document.querySelectorAll('.nav-item[data-page]').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    const content = document.getElementById('page-content');
    const breadcrumb = document.getElementById('breadcrumb');

    if (page === 'dashboard') {
      breadcrumb.innerHTML = '<span class="crumb-current">대시보드</span>';
      content.innerHTML = await Pages.dashboard();
    } else if (page.startsWith('projects-')) {
      const phase = page.split('-')[1];
      breadcrumb.innerHTML = `<span>사업 관리</span><span class="crumb-sep">›</span><span class="crumb-current">${phase}</span>`;
      content.innerHTML = await Pages.projectList(phase);
    } else if (page === 'project' && param) {
      const project = await DB.getProject(param);
      breadcrumb.innerHTML = `<a href="#" onclick="App.navigate('projects-${project?.current_phase||'수주'}');return false;" style="color:var(--s500)">${project?.current_phase||'수주'}</a><span class="crumb-sep">›</span><span class="crumb-current">${esc(project?.name||'')}</span>`;
      content.innerHTML = await Pages.projectDetail(param);
    } else if (page === 'regulations') {
      breadcrumb.innerHTML = '<span class="crumb-current">사규 / 결재규정</span>';
      content.innerHTML = await Pages.regulations();
    } else if (page === 'templates') {
      breadcrumb.innerHTML = '<span class="crumb-current">프로세스 템플릿</span>';
      content.innerHTML = await Pages.templates();
    } else if (page === 'settings') {
      breadcrumb.innerHTML = '<span class="crumb-current">알림 설정</span>';
      content.innerHTML = await Pages.settings();
    }

    // rebind click on project cards
    document.querySelectorAll('[data-proj-id]').forEach(el => {
      el.addEventListener('click', () => App.navigate('project', el.dataset.projId));
    });
  },

  async updateNavCounts() {
    try {
      const projects = await DB.getProjects();
      for (const phase of ['수주','발주','청구']) {
        const cnt = projects.filter(p => p.current_phase === phase && p.status !== '완료').length;
        const el = document.getElementById(`cnt-${phase}`);
        if (el) el.textContent = cnt > 0 ? cnt : '';
      }
    } catch {}
  },

  async checkAlerts() {
    try {
      const projects = await DB.getProjects();
      const settings = DB.getSettings();
      const alerts = [];
      const today = new Date(); today.setHours(0,0,0,0);
      for (const p of projects) {
        const steps = await DB.getSteps(p.id);
        steps.forEach(s => {
          if (s.done || !s.due_date) return;
          const diff = daysDiff(s.due_date);
          if (diff < 0) alerts.push({ type: 'danger', project: p.name, step: s.name, diff });
          else if (diff <= (settings.notifyDays || 3)) alerts.push({ type: 'warning', project: p.name, step: s.name, diff });
        });
      }
      const strip = document.getElementById('alert-strip');
      const dot = document.getElementById('notif-dot');
      if (alerts.length > 0) {
        const ov = alerts.filter(a => a.type === 'danger').length;
        const up = alerts.filter(a => a.type === 'warning').length;
        let msg = '🔔 ';
        if (ov > 0) msg += `<strong>${ov}건 기한 초과</strong>  `;
        if (up > 0) msg += `<strong>${up}건 마감 임박</strong>  `;
        msg += '<a href="#" onclick="App.navigate(\'settings\');return false;" style="color:#78350F;font-weight:700;text-decoration:underline">알림 목록 →</a>';
        strip.innerHTML = msg;
        strip.style.display = 'flex';
        dot.style.display = '';
      } else {
        strip.style.display = 'none';
        dot.style.display = 'none';
      }
    } catch {}
  },

  // ── New Project Modal ──
  showNewProjectModal() {
    Modal.open('새 사업 등록', `
      <div class="tab-bar" id="np-tabs">
        <button class="tab-btn active" data-tab="manual">직접 입력</button>
        <button class="tab-btn" data-tab="spec">구매규격 분석 <span class="ai-badge">AI</span></button>
      </div>
      <div id="tab-manual">
        <div class="form-grid cols-2">
          <div class="form-field full">
            <label class="form-label">사업명 <span class="req">*</span></label>
            <input type="text" class="form-input" id="np-name" placeholder="예) 2026년 전력ICT 인프라 구축사업">
          </div>
          <div class="form-field">
            <label class="form-label">고객사</label>
            <input type="text" class="form-input" id="np-client" placeholder="예) 한국전력공사">
          </div>
          <div class="form-field">
            <label class="form-label">담당자</label>
            <input type="text" class="form-input" id="np-manager" placeholder="담당자명">
          </div>
          <div class="form-field">
            <label class="form-label">계약금액 (원)</label>
            <input type="number" class="form-input" id="np-amount" placeholder="예) 300000000">
          </div>
          <div class="form-field">
            <label class="form-label">사업 단계</label>
            <select class="form-select" id="np-phase">
              <option value="수주">수주</option>
              <option value="발주">발주</option>
              <option value="청구">청구</option>
            </select>
          </div>
          <div class="form-field">
            <label class="form-label">계약일</label>
            <input type="date" class="form-input" id="np-contract">
          </div>
          <div class="form-field">
            <label class="form-label">납기일</label>
            <input type="date" class="form-input" id="np-deadline">
          </div>
          <div class="form-field full">
            <label class="form-label">비고</label>
            <textarea class="form-textarea" id="np-memo" placeholder="특이사항"></textarea>
          </div>
        </div>
      </div>
      <div id="tab-spec" style="display:none">
        <div class="form-field mb-3">
          <label class="form-label">구매규격서 / 과업지시서 내용 붙여넣기</label>
          <textarea class="form-textarea" id="spec-input" style="min-height:160px" placeholder="구매규격서나 과업지시서 전체 내용을 복사해서 붙여넣으면 납기, 시운전 기간, 제출 서류 등을 자동 분석합니다..."></textarea>
        </div>
        <button class="btn btn-primary mb-3" onclick="App.runSpecAnalysis()">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/></svg>
          AI 분석 시작
        </button>
        <div id="spec-result-area"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">취소</button>
        <button class="btn btn-primary" id="np-submit" onclick="App.createProject()">
          사업 등록
        </button>
      </div>
    `, 'modal-lg');

    // tab switching
    document.querySelectorAll('#np-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#np-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-manual').style.display = btn.dataset.tab === 'manual' ? '' : 'none';
        document.getElementById('tab-spec').style.display = btn.dataset.tab === 'spec' ? '' : 'none';
        document.getElementById('np-submit').style.display = btn.dataset.tab === 'manual' ? '' : 'none';
      });
    });
  },

  runSpecAnalysis() {
    const text = document.getElementById('spec-input').value.trim();
    if (!text) { Toast.show('입력 필요', '구매규격 내용을 붙여넣어 주세요.', 'warning'); return; }
    const area = document.getElementById('spec-result-area');
    area.innerHTML = `<div class="loading-row"><div class="spinner"></div> 구매규격 분석 중...</div>`;
    setTimeout(() => {
      const r = SpecAnalyzer.analyze(text);
      App._specAnalysis = r;
      const fields = Object.entries(r.extractedFields).map(([k, v]) => `
        <div class="spec-result-item">
          <div class="spec-item-label">${esc(v.label)}</div>
          <div class="spec-item-value ${v.value ? '' : 'not-found'}">${esc(v.value || '명시되지 않음')}</div>
        </div>
      `).join('');

      const docs = r.detectedDocuments.length > 0 ?
        r.detectedDocuments.map(d => `
          <div class="checklist-item">
            <input type="checkbox" checked>
            <span>${esc(d)}</span>
          </div>
        `).join('') : '<div style="color:var(--s400);font-size:13px">명시된 제출 서류가 없습니다</div>';

      area.innerHTML = `
        <div class="ai-box">
          <div class="ai-box-title">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/></svg>
            AI 분석 완료
            ${r.amount ? `<span style="font-size:11px;font-weight:400;color:#6366F1">추정 금액: ${esc(r.amount)}</span>` : ''}
          </div>
          <div class="spec-result-grid">${fields}</div>
          <div class="checklist-wrap">
            <div class="checklist-title">📋 감지된 제출 서류 (${r.detectedDocuments.length}건)</div>
            ${docs}
          </div>
          <div class="divider"></div>
          <div class="form-grid cols-2 mt-3">
            <div class="form-field full">
              <label class="form-label">사업명 <span class="req">*</span></label>
              <input type="text" class="form-input" id="spec-name" placeholder="사업명 입력">
            </div>
            <div class="form-field">
              <label class="form-label">고객사</label>
              <input type="text" class="form-input" id="spec-client" placeholder="고객사">
            </div>
            <div class="form-field">
              <label class="form-label">사업 단계</label>
              <select class="form-select" id="spec-phase">
                <option value="수주">수주</option><option value="발주">발주</option><option value="청구">청구</option>
              </select>
            </div>
          </div>
          <div class="modal-footer" style="padding:14px 0 0">
            <button class="btn btn-secondary" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" onclick="App.createProjectFromSpec()">이 분석으로 사업 등록</button>
          </div>
        </div>
      `;
    }, 700);
  },

  async createProject() {
    const name = document.getElementById('np-name').value.trim();
    if (!name) { Toast.show('필수 입력', '사업명을 입력해 주세요.', 'warning'); return; }
    const phase = document.getElementById('np-phase').value;
    const amount = document.getElementById('np-amount').value;
    const project = {
      id: DB.uid(),
      name,
      client: document.getElementById('np-client').value,
      manager: document.getElementById('np-manager').value,
      amount: amount ? parseInt(amount) : 0,
      current_phase: phase,
      contract_date: document.getElementById('np-contract').value || null,
      deadline: document.getElementById('np-deadline').value || null,
      status: '진행중',
      memo: document.getElementById('np-memo').value,
      created_at: new Date().toISOString()
    };

    // 2억 이상이면 심의회 단계 포함 여부 확인
    const needsReview = project.amount >= 200000000;

    await DB.addProject(project);
    await this._createDefaultSteps(project.id, phase, project.contract_date, needsReview);
    Modal.close();
    await App.navigate('project', project.id);
    await App.updateNavCounts();
    Toast.show('사업 등록 완료', `"${name}" 사업이 등록되었습니다.`, 'success');

    if (needsReview) {
      Toast.show('심의회 필요', '수주금액 2억 이상 — 전력ICT사업 심의회가 포함되었습니다.', 'warning');
    }
  },

  async _createDefaultSteps(projectId, phase, contractDate, needsReview) {
    const templates = await DB.getTemplates();
    const tpl = templates.find(t => t.is_default) || templates[0];
    if (!tpl) return;

    const allPhases = phase === '수주' ? ['수주','발주','청구'] :
                      phase === '발주' ? ['발주','청구'] : ['청구'];

    let idx = 0;
    for (const ph of allPhases) {
      const phaseSteps = tpl.phases?.[ph] || [];
      for (const s of phaseSteps) {
        if (ph === '수주' && s.document_type === '심의회 결과보고' && !needsReview) {
          idx++; continue;
        }
        const step = {
          id: DB.uid(),
          project_id: projectId,
          phase: ph,
          name: s.name,
          document_type: s.document_type || '',
          direction: s.direction || 'internal',
          category: s.category || '',
          approver: s.approver || '',
          approval_level: s.approval_level || '',
          requires_audit: s.requires_audit || false,
          regulation_ref: s.regulation_ref || '',
          is_conditional: s.is_conditional || false,
          condition_desc: s.condition_desc || '',
          done: false,
          due_date: null,
          notes: s.notes || '',
          order_index: idx++
        };
        await DB.addStep(step);
      }
    }
  },

  async createProjectFromSpec() {
    const name = document.getElementById('spec-name')?.value.trim();
    if (!name) { Toast.show('필수 입력', '사업명을 입력해 주세요.', 'warning'); return; }
    const r = App._specAnalysis;
    const phase = document.getElementById('spec-phase')?.value || '수주';
    const project = {
      id: DB.uid(),
      name,
      client: document.getElementById('spec-client')?.value || '',
      amount: 0,
      current_phase: phase,
      status: '진행중',
      memo: '구매규격 자동 분석으로 생성',
      spec_analysis: r,
      created_at: new Date().toISOString()
    };
    await DB.addProject(project);
    await this._createDefaultSteps(project.id, phase, null, false);
    Modal.close();
    await App.navigate('project', project.id);
    await App.updateNavCounts();
    Toast.show('사업 등록', `"${name}" 분석 결과로 사업이 등록되었습니다.`, 'success');
  },

  // ── Project Edit ──
  async showEditProject(id) {
    const p = await DB.getProject(id);
    Modal.open('사업 정보 수정', `
      <div class="form-grid cols-2">
        <div class="form-field full">
          <label class="form-label">사업명</label>
          <input type="text" class="form-input" id="ep-name" value="${esc(p.name)}">
        </div>
        <div class="form-field">
          <label class="form-label">고객사</label>
          <input type="text" class="form-input" id="ep-client" value="${esc(p.client||'')}">
        </div>
        <div class="form-field">
          <label class="form-label">담당자</label>
          <input type="text" class="form-input" id="ep-manager" value="${esc(p.manager||'')}">
        </div>
        <div class="form-field">
          <label class="form-label">계약금액 (원)</label>
          <input type="number" class="form-input" id="ep-amount" value="${p.amount||''}">
        </div>
        <div class="form-field">
          <label class="form-label">현재 단계</label>
          <select class="form-select" id="ep-phase">
            ${['수주','발주','청구'].map(ph=>`<option value="${ph}" ${p.current_phase===ph?'selected':''}>${ph}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">상태</label>
          <select class="form-select" id="ep-status">
            ${['대기','진행중','완료','보류'].map(s=>`<option value="${s}" ${p.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">계약일</label>
          <input type="date" class="form-input" id="ep-contract" value="${p.contract_date||''}">
        </div>
        <div class="form-field">
          <label class="form-label">납기일</label>
          <input type="date" class="form-input" id="ep-deadline" value="${p.deadline||''}">
        </div>
        <div class="form-field full">
          <label class="form-label">비고</label>
          <textarea class="form-textarea" id="ep-memo">${esc(p.memo||'')}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">취소</button>
        <button class="btn btn-primary" onclick="App.saveEditProject('${id}')">저장</button>
      </div>
    `);
  },

  async saveEditProject(id) {
    await DB.updateProject(id, {
      name: document.getElementById('ep-name').value,
      client: document.getElementById('ep-client').value,
      manager: document.getElementById('ep-manager').value,
      amount: parseInt(document.getElementById('ep-amount').value) || 0,
      current_phase: document.getElementById('ep-phase').value,
      status: document.getElementById('ep-status').value,
      contract_date: document.getElementById('ep-contract').value || null,
      deadline: document.getElementById('ep-deadline').value || null,
      memo: document.getElementById('ep-memo').value
    });
    Modal.close();
    await App.navigate('project', id);
    await App.updateNavCounts();
    Toast.show('수정 완료', '사업 정보가 저장되었습니다.', 'success');
  },

  async deleteProject(id) {
    if (!confirm('정말 삭제하시겠습니까? 모든 프로세스 단계도 삭제됩니다.')) return;
    await DB.deleteProject(id);
    await App.navigate('dashboard');
    await App.updateNavCounts();
    Toast.show('삭제 완료', '사업이 삭제되었습니다.', 'primary');
  },

  // ── Step actions ──
  async toggleStep(stepId, projectId) {
    const steps = await DB.getSteps(projectId);
    const step = steps.find(s => s.id === stepId);
    if (!step) return;
    const newDone = !step.done;
    await DB.updateStep(stepId, { done: newDone, done_at: newDone ? new Date().toISOString() : null });
    await App.navigate('project', projectId);
    await App.checkAlerts();
  },

  async saveStepDue(stepId, projectId) {
    const val = document.getElementById(`due-${stepId}`)?.value;
    if (val === undefined) return;
    await DB.updateStep(stepId, { due_date: val || null });
    await App.navigate('project', projectId);
    await App.checkAlerts();
    Toast.show('저장됨', '마감일이 저장되었습니다.', 'success');
  },

  async saveStepNote(stepId, projectId) {
    const val = document.getElementById(`note-${stepId}`)?.value;
    if (val === undefined) return;
    await DB.updateStep(stepId, { notes: val });
    Toast.show('저장됨', '메모가 저장되었습니다.', 'success');
  },

  async deleteStep(stepId, projectId) {
    if (!confirm('이 단계를 삭제하시겠습니까?')) return;
    await DB.deleteStep(stepId);
    await App.navigate('project', projectId);
    Toast.show('삭제됨', '단계가 삭제되었습니다.', 'primary');
  },

  async showAddStep(projectId, phase) {
    Modal.open('단계 추가', `
      <div class="form-grid cols-2">
        <div class="form-field full">
          <label class="form-label">단계명 <span class="req">*</span></label>
          <input type="text" class="form-input" id="as-name" placeholder="예) 착수신고서 제출">
        </div>
        <div class="form-field">
          <label class="form-label">문서 유형</label>
          <input type="text" class="form-input" id="as-doctype" placeholder="예) 공문, 보고서">
        </div>
        <div class="form-field">
          <label class="form-label">방향</label>
          <select class="form-select" id="as-dir">
            <option value="internal">내부 문서</option>
            <option value="outgoing">발신 (→ 외부)</option>
            <option value="incoming">수신 (← 외부)</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">단계</label>
          <select class="form-select" id="as-phase">
            ${['수주','발주','청구'].map(ph=>`<option value="${ph}" ${ph===phase?'selected':''}>${ph}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">마감일</label>
          <input type="date" class="form-input" id="as-due">
        </div>
        <div class="form-field full">
          <label class="form-label">메모</label>
          <textarea class="form-textarea" id="as-notes"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">취소</button>
        <button class="btn btn-primary" onclick="App.saveAddStep('${projectId}')">추가</button>
      </div>
    `);
  },

  async saveAddStep(projectId) {
    const name = document.getElementById('as-name').value.trim();
    if (!name) { Toast.show('필수 입력', '단계명을 입력해 주세요.', 'warning'); return; }
    const steps = await DB.getSteps(projectId);
    const phase = document.getElementById('as-phase').value;
    const phaseSteps = steps.filter(s => s.phase === phase);
    await DB.addStep({
      id: DB.uid(),
      project_id: projectId,
      phase,
      name,
      document_type: document.getElementById('as-doctype').value,
      direction: document.getElementById('as-dir').value,
      category: '',
      approver: '', approval_level: '', requires_audit: false, regulation_ref: '',
      is_conditional: false, condition_desc: '',
      done: false,
      due_date: document.getElementById('as-due').value || null,
      notes: document.getElementById('as-notes').value,
      order_index: phaseSteps.length
    });
    Modal.close();
    await App.navigate('project', projectId);
    Toast.show('추가됨', `"${name}" 단계가 추가되었습니다.`, 'success');
  },

  // ── Approval edit ──
  async editStepApproval(stepId) {
    const allSteps = LS.get('bm_steps', []);
    const step = allSteps.find(s => s.id === stepId) || {};
    Modal.open('결재 정보 설정', `
      ${Approval.editForm(step)}
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">취소</button>
        <button class="btn btn-primary" onclick="App.saveApproval('${stepId}')">저장</button>
      </div>
    `);
  },

  async saveApproval(stepId) {
    const approver = document.getElementById('apr-approver').value;
    const level = document.getElementById('apr-level').value;
    const audit = document.getElementById('apr-audit').checked;
    const ref = document.getElementById('apr-ref').value;
    await DB.updateStep(stepId, { approver, approval_level: level, requires_audit: audit, regulation_ref: ref });

    // reload current page
    const step = LS.get('bm_steps', []).find(s => s.id === stepId);
    Modal.close();
    if (step) await App.navigate('project', step.project_id);
    Toast.show('저장됨', '결재 정보가 저장되었습니다.', 'success');
  },

  // ── Regulations ──
  async showAddRegulation() {
    Modal.open('사규 / 규정 추가', `
      <div class="form-grid">
        <div class="form-field full">
          <label class="form-label">규정명 <span class="req">*</span></label>
          <input type="text" class="form-input" id="reg-title" placeholder="예) 계약업무 처리규정">
        </div>
        <div class="form-field full">
          <label class="form-label">규정 내용 (핵심 조항 요약)</label>
          <textarea class="form-textarea" id="reg-content" style="min-height:120px" placeholder="결재권자, 금액 기준 등 핵심 내용 입력..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">취소</button>
        <button class="btn btn-primary" onclick="App.saveRegulation()">저장</button>
      </div>
    `);
  },

  async saveRegulation() {
    const title = document.getElementById('reg-title').value.trim();
    if (!title) { Toast.show('필수 입력', '규정명을 입력해 주세요.', 'warning'); return; }
    await DB.addRegulation({ id: DB.uid(), title, content: document.getElementById('reg-content').value, created_at: new Date().toISOString() });
    Modal.close();
    await App.navigate('regulations');
    Toast.show('추가됨', '사규가 추가되었습니다.', 'success');
  },

  async deleteRegulation(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    await DB.deleteRegulation(id);
    await App.navigate('regulations');
    Toast.show('삭제됨', '규정이 삭제되었습니다.', 'primary');
  },

  async showAddApprovalRule() {
    const regs = await DB.getRegulations();
    Modal.open('결재 규정 추가', `
      <div class="form-grid cols-2">
        <div class="form-field full">
          <label class="form-label">문서 유형 <span class="req">*</span></label>
          <input type="text" class="form-input" id="ar-doctype" placeholder="예) 수주추진보고, 발주의뢰">
        </div>
        <div class="form-field full">
          <label class="form-label">설명</label>
          <input type="text" class="form-input" id="ar-desc" placeholder="해당 규정 설명">
        </div>
        <div class="form-field">
          <label class="form-label">금액 하한 (원, 0이면 제한 없음)</label>
          <input type="number" class="form-input" id="ar-min" value="0">
        </div>
        <div class="form-field">
          <label class="form-label">금액 상한 (원, 비우면 무제한)</label>
          <input type="number" class="form-input" id="ar-max" placeholder="비우면 무제한">
        </div>
        <div class="form-field">
          <label class="form-label">결재권자 <span class="req">*</span></label>
          <input type="text" class="form-input" id="ar-approver" placeholder="예) 팀장, 부서장, 처장">
        </div>
        <div class="form-field">
          <label class="form-label">결재 단계</label>
          <input type="text" class="form-input" id="ar-level" placeholder="예) 전결, 합의">
        </div>
        <div class="form-field full">
          <label class="form-label">
            <input type="checkbox" id="ar-audit" style="margin-right:6px">
            감사 부서 합의 필요
          </label>
        </div>
        <div class="form-field full">
          <label class="form-label">메모 / 사규 조항</label>
          <input type="text" class="form-input" id="ar-notes" placeholder="예) 계약업무처리규정 제15조">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">취소</button>
        <button class="btn btn-primary" onclick="App.saveApprovalRule()">저장</button>
      </div>
    `);
  },

  async saveApprovalRule() {
    const docType = document.getElementById('ar-doctype').value.trim();
    const approver = document.getElementById('ar-approver').value.trim();
    if (!docType || !approver) { Toast.show('필수 입력', '문서 유형과 결재권자를 입력해 주세요.', 'warning'); return; }
    const max = document.getElementById('ar-max').value;
    await DB.addApprovalRule({
      id: DB.uid(),
      document_type: docType,
      description: document.getElementById('ar-desc').value,
      amount_min: parseInt(document.getElementById('ar-min').value) || 0,
      amount_max: max ? parseInt(max) : null,
      approver,
      approval_level: document.getElementById('ar-level').value,
      requires_audit: document.getElementById('ar-audit').checked,
      notes: document.getElementById('ar-notes').value,
      created_at: new Date().toISOString()
    });
    Modal.close();
    await App.navigate('regulations');
    Toast.show('추가됨', '결재 규정이 추가되었습니다.', 'success');
  },

  async deleteApprovalRule(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    await DB.deleteApprovalRule(id);
    await App.navigate('regulations');
    Toast.show('삭제됨', '규정이 삭제되었습니다.', 'primary');
  },

  // ── Export / Import ──
  async exportData() {
    const data = await DB.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `사업관리_${fmtDate(new Date())}.json`;
    a.click();
    Toast.show('내보내기 완료', '데이터가 저장되었습니다.', 'success');
  },

  importData() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async e => {
      const file = e.target.files[0]; if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        await DB.importAll(data);
        await App.navigate('dashboard');
        await App.updateNavCounts();
        Toast.show('가져오기 완료', '데이터가 복원되었습니다.', 'success');
      } catch { Toast.show('오류', '올바르지 않은 파일 형식입니다.', 'danger'); }
    };
    input.click();
  },

  saveSettings() {
    const days = parseInt(document.getElementById('st-days').value) || 3;
    const enabled = document.getElementById('st-enabled').checked;
    DB.saveSettings({ notifyDays: days, notifyEnabled: enabled });
    App.checkAlerts();
    Toast.show('저장됨', '알림 설정이 저장되었습니다.', 'success');
  }
};

// ── Pages ─────────────────────────────────────────────────────
const Pages = {

  async dashboard() {
    const projects = await DB.getProjects();
    const allSteps = [];
    for (const p of projects) {
      const steps = await DB.getSteps(p.id);
      steps.forEach(s => allSteps.push({ ...s, _project: p }));
    }
    const today = new Date(); today.setHours(0,0,0,0);
    const overdue  = allSteps.filter(s => !s.done && s.due_date && new Date(s.due_date) < today);
    const upcoming = allSteps.filter(s => {
      if (s.done || !s.due_date) return false;
      const d = daysDiff(s.due_date);
      return d >= 0 && d <= 7;
    }).sort((a,b) => new Date(a.due_date) - new Date(b.due_date));

    const active    = projects.filter(p => p.status === '진행중').length;
    const completed = projects.filter(p => p.status === '완료').length;

    const phaseCards = ['수주','발주','청구'].map(ph => {
      const phProj = projects.filter(p => p.current_phase === ph);
      const col = PHASE_COLORS[ph];
      return `
        <div class="kpi-card ${col}" style="cursor:pointer" onclick="App.navigate('projects-${ph}')">
          <div class="kpi-top">
            <div class="kpi-icon ${col}">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v1a1 1 0 102 0v-1zm2-3a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm4-1a1 1 0 10-2 0v4a1 1 0 102 0V8z" clip-rule="evenodd"/></svg>
            </div>
            <span class="phase-pill ${col}">${ph}</span>
          </div>
          <div class="kpi-value">${phProj.length}</div>
          <div class="kpi-label">${ph} 사업</div>
          <div class="kpi-sub">진행중 ${phProj.filter(p=>p.status==='진행중').length}건</div>
        </div>
      `;
    }).join('');

    const alertItems = [...overdue, ...upcoming.slice(0,5)].slice(0,6).map(s => {
      const diff = s.due_date ? daysDiff(s.due_date) : null;
      const type = diff !== null && diff < 0 ? 'danger' : 'warning';
      const msg  = diff === null ? '' : diff < 0 ? `${Math.abs(diff)}일 초과` : diff === 0 ? '오늘 마감' : `D-${diff}`;
      return `
        <div class="notif-item ${type}" style="cursor:pointer" onclick="App.navigate('project','${s._project.id}')">
          <div class="notif-ico ${type}">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          </div>
          <div>
            <div class="notif-title">${esc(s.name)} <span style="font-size:11px;color:var(--s400)">— ${s.phase}</span></div>
            <div class="notif-desc">${esc(s._project.name)} · ${msg}</div>
          </div>
        </div>
      `;
    }).join('');

    const recentCards = projects.slice(0,4).map(p => projCard(p)).join('');

    return `
      <div class="kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
        ${phaseCards}
        <div class="kpi-card red">
          <div class="kpi-top">
            <div class="kpi-icon red">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
            </div>
          </div>
          <div class="kpi-value">${overdue.length}</div>
          <div class="kpi-label">기한 초과</div>
          <div class="kpi-sub">즉시 조치 필요</div>
        </div>
      </div>

      ${alertItems ? `
        <div class="section-header mt-6">
          <div class="section-title">🔔 주요 알림 <span class="phase-pill" style="background:var(--red-light);color:var(--red)">${overdue.length+upcoming.length}건</span></div>
          <button class="btn btn-ghost btn-sm" onclick="App.navigate('settings')">전체 보기</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:28px">${alertItems}</div>
      ` : ''}

      <div class="section-header">
        <div class="section-title">최근 사업</div>
        <button class="btn btn-ghost btn-sm" onclick="App.navigate('projects-수주')">전체 보기</button>
      </div>
      ${projects.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>등록된 사업이 없습니다</h3>
          <p>좌측 하단 "새 사업 등록"을 눌러<br>첫 번째 사업을 시작해 보세요.</p>
        </div>
      ` : `<div class="projects-grid">${recentCards}</div>`}
    `;
  },

  async projectList(phase) {
    const all = await DB.getProjects();
    const projects = all.filter(p => p.current_phase === phase);
    const col = PHASE_COLORS[phase];

    return `
      <div class="section-header">
        <div class="section-title">
          <span class="phase-pill ${col}">${phase}</span>
          ${phase} 사업 목록
        </div>
        <div class="flex gap-2">
          <button class="btn btn-secondary btn-sm" onclick="App.importData()">가져오기</button>
          <button class="btn btn-secondary btn-sm" onclick="App.exportData()">내보내기</button>
        </div>
      </div>
      ${projects.length === 0
        ? `<div class="empty-state"><div class="empty-icon">📂</div><h3>${phase} 사업이 없습니다</h3><p>새 사업 등록으로 시작해 보세요.</p></div>`
        : `<div class="projects-grid">${projects.map(p => projCard(p)).join('')}</div>`}
    `;
  },

  async projectDetail(id) {
    const p = await DB.getProject(id);
    if (!p) return '<div class="empty-state"><h3>사업을 찾을 수 없습니다</h3></div>';
    const steps = await DB.getSteps(id);
    const col = PHASE_COLORS[p.current_phase] || 'blue';

    // Phase progress indicator
    const phases = ['수주','발주','청구'];
    const phaseProgress = phases.map((ph, i) => {
      const phSteps = steps.filter(s => s.phase === ph);
      const allDone = phSteps.length > 0 && phSteps.every(s => s.done);
      const isActive = ph === p.current_phase;
      const stateClass = allDone ? 'done' : isActive ? 'active' : 'todo';
      const arrow = i < phases.length-1 ? `<svg class="phase-arrow" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>` : '';
      return `
        <div class="phase-step">
          <div class="phase-step-inner ${stateClass}">
            <div class="phase-step-num">${allDone ? '✓' : i+1}</div>
            ${ph} ${phSteps.length > 0 ? `(${phSteps.filter(s=>s.done).length}/${phSteps.length})` : ''}
          </div>
        </div>
        ${arrow}
      `;
    }).join('');

    // Overall progress
    const done = steps.filter(s => s.done).length;
    const total = steps.length;
    const pct = total > 0 ? Math.round(done/total*100) : 0;

    // Phase tabs
    const phaseTabs = phases.map(ph => {
      const phSteps = steps.filter(s => s.phase === ph);
      const allDone = phSteps.length > 0 && phSteps.every(s => s.done);
      const c = PHASE_COLORS[ph];
      return `
        <button class="phase-tab ${p.current_phase === ph ? `active ${c}` : ''}"
          onclick="App.switchPhase('${id}','${ph}')" data-ph="${ph}">
          <span class="tab-dot"></span>
          ${ph} ${allDone ? '✓' : `(${phSteps.filter(s=>s.done).length}/${phSteps.length})`}
        </button>
      `;
    }).join('');

    // Steps for current phase
    const phaseSteps = steps.filter(s => s.phase === p.current_phase);
    const timelineHtml = phaseSteps.length === 0
      ? `<div class="empty-state"><div class="empty-icon">📝</div><h3>프로세스 단계가 없습니다</h3></div>`
      : phaseSteps.map((s, i) => Pages.renderStep(s, i, id, p.current_phase)).join('');

    return `
      <div class="detail-layout">
        <!-- Hero card -->
        <div class="detail-hero">
          <div class="detail-hero-top">
            <div class="detail-hero-info">
              <button class="btn btn-ghost btn-sm mb-2" onclick="App.navigate('projects-${p.current_phase}')">
                <svg viewBox="0 0 20 20" fill="currentColor" width="14"><path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
                목록으로
              </button>
              <div class="detail-title">${esc(p.name)}</div>
              <div class="detail-meta">
                ${p.client ? `<span class="detail-meta-item"><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clip-rule="evenodd"/></svg>${esc(p.client)}</span>` : ''}
                ${p.manager ? `<span class="detail-meta-item"><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>${esc(p.manager)}</span>` : ''}
                ${p.amount ? `<span class="detail-meta-item">💰 ${fmtAmt(p.amount)}원</span>` : ''}
                ${p.contract_date ? `<span class="detail-meta-item">📅 ${p.contract_date} ~ ${p.deadline||'미정'}</span>` : ''}
                ${p.amount >= 200000000 ? `<span class="detail-meta-item" style="color:var(--red);font-weight:700">⚠️ 2억 이상 — 심의회 필요</span>` : ''}
              </div>
            </div>
            <div class="detail-hero-actions">
              <span class="status-pill ${p.status}">${p.status}</span>
              <button class="btn btn-secondary btn-sm" onclick="App.showEditProject('${id}')">수정</button>
              <button class="btn btn-danger btn-sm" onclick="App.deleteProject('${id}')">삭제</button>
            </div>
          </div>
          <div class="detail-progress-bar">
            <div class="detail-progress-fill" style="width:${pct}%;background:${pct===100?'var(--green)':'linear-gradient(90deg,var(--blue),#818CF8)'}"></div>
          </div>
        </div>

        <!-- Phase progress -->
        <div class="phase-progress">${phaseProgress}</div>

        <!-- Phase tabs -->
        <div class="flex justify-between items-center">
          <div class="phase-tabs">${phaseTabs}</div>
          <button class="btn btn-secondary btn-sm" onclick="App.showAddStep('${id}','${p.current_phase}')">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
            단계 추가
          </button>
        </div>

        <!-- Timeline -->
        <div class="timeline">${timelineHtml}</div>
      </div>
    `;
  },

  renderStep(s, i, projectId, phase) {
    const col = PHASE_COLORS[phase] || 'blue';
    const dirLabel = DIRECTION_LABEL[s.direction] || '';
    const dirClass = DIRECTION_CLASS[s.direction] || 'dir-int';
    const stateClass = s.done ? 'done' : '';
    const iconState  = s.done ? 'done' : '';

    return `
      <div class="timeline-item ${s.done ? 'done' : ''}">
        <div class="tl-icon-wrap ${iconState} ${s.is_conditional ? 'conditional' : ''}">
          ${s.done
            ? `<svg class="tl-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`
            : `<svg class="tl-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>`
          }
        </div>
        <div class="tl-card ${stateClass}" id="tl-${s.id}">
          <div class="tl-card-header" onclick="document.getElementById('tl-${s.id}').classList.toggle('expanded')">
            <span class="tl-step-num">${String(i+1).padStart(2,'0')}</span>
            <span class="tl-step-name">${esc(s.name)}</span>
            <div class="tl-tags">
              <span class="tl-tag ${dirClass}">${dirLabel}</span>
              ${s.is_conditional ? `<span class="tl-tag cond">조건부</span>` : ''}
            </div>
            ${duePill(s)}
            <button class="tl-check ${s.done ? 'checked' : ''}"
              onclick="event.stopPropagation();App.toggleStep('${s.id}','${projectId}')"
              title="${s.done ? '완료 취소' : '완료 처리'}"></button>
            <svg class="tl-expand-btn" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div class="tl-card-body">
            ${s.is_conditional ? `<div class="cond-notice"><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg> 조건: ${esc(s.condition_desc)}</div>` : ''}
            ${Approval.renderApprovalBox(s)}
            <div class="tl-body-fields">
              <div class="field-row">
                <span class="field-label">마감일</span>
                <input type="date" class="field-input" id="due-${s.id}" value="${s.due_date||''}">
                <button class="btn btn-secondary btn-sm" onclick="App.saveStepDue('${s.id}','${projectId}')">저장</button>
              </div>
              <div class="field-row">
                <span class="field-label">메모</span>
                <textarea class="field-textarea" id="note-${s.id}" placeholder="메모 입력...">${esc(s.notes||'')}</textarea>
              </div>
            </div>
            <div class="tl-actions">
              <button class="btn btn-secondary btn-sm" onclick="App.saveStepNote('${s.id}','${projectId}')">메모 저장</button>
              <button class="btn btn-danger btn-sm" onclick="App.deleteStep('${s.id}','${projectId}')">삭제</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async regulations() {
    const regs = await DB.getRegulations();
    const rules = await DB.getApprovalRules();
    return `
      <div class="tab-bar" id="reg-tabs">
        <button class="tab-btn active" data-tab="reg">사규 / 규정</button>
        <button class="tab-btn" data-tab="rules">결재 규정표</button>
      </div>
      <div id="reg-panel-reg">
        <div class="section-header mb-3">
          <div class="section-title">사규 목록</div>
          <button class="btn btn-primary btn-sm" onclick="App.showAddRegulation()">+ 사규 추가</button>
        </div>
        ${regs.length === 0
          ? `<div class="empty-state"><div class="empty-icon">📖</div><h3>등록된 사규가 없습니다</h3><p>사규를 추가하면 결재권자 판단에 활용됩니다.</p></div>`
          : `<div style="display:flex;flex-direction:column;gap:8px">
            ${regs.map(r => `
              <div class="regulation-card">
                <div class="reg-icon"><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg></div>
                <div class="reg-info">
                  <div class="reg-name">${esc(r.title)}</div>
                  <div class="reg-desc">${esc(r.content?.slice(0,100) || '내용 없음')}</div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="App.deleteRegulation('${r.id}')">삭제</button>
              </div>
            `).join('')}
          </div>`}
      </div>
      <div id="reg-panel-rules" style="display:none">
        <div class="section-header mb-3">
          <div class="section-title">결재 규정표</div>
          <button class="btn btn-primary btn-sm" onclick="App.showAddApprovalRule()">+ 규정 추가</button>
        </div>
        <p class="text-sm text-muted mb-3">문서 유형과 금액 기준으로 결재권자를 자동으로 매핑합니다. 사규를 넣어주시면 조항 기준으로 추가할 수 있습니다.</p>
        ${rules.length === 0
          ? `<div class="empty-state"><div class="empty-icon">⚖️</div><h3>등록된 결재 규정이 없습니다</h3><p>결재 규정을 추가하면 각 단계에 자동으로 결재권자가 표시됩니다.</p></div>`
          : `<div style="display:flex;flex-direction:column;gap:0">
            <div style="display:grid;grid-template-columns:2fr 2fr 1fr 1fr 1fr auto;gap:8px;padding:10px 18px;background:var(--s50);border-radius:var(--r-sm);font-size:11px;font-weight:700;color:var(--s500);margin-bottom:4px">
              <span>문서 유형</span><span>금액 범위</span><span>결재권자</span><span>결재 단계</span><span>감사</span><span></span>
            </div>
            ${rules.map(r => `
              <div class="approval-rule-card">
                <div style="flex:2"><div class="ar-doc-type">${esc(r.document_type)}</div><div class="ar-amount text-xs text-muted">${r.description||''}</div></div>
                <div style="flex:2;font-size:12px;color:var(--s500)">${fmtAmt(r.amount_min)||'0'}원 ~ ${r.amount_max ? fmtAmt(r.amount_max)+'원' : '제한 없음'}</div>
                <div style="flex:1" class="ar-approver">${esc(r.approver)}</div>
                <div style="flex:1;font-size:12px">${esc(r.approval_level||'-')}</div>
                <div style="flex:1"><span class="ar-audit ${r.requires_audit?'yes':'no'}">${r.requires_audit?'필요':'불필요'}</span></div>
                <button class="btn btn-danger btn-sm" onclick="App.deleteApprovalRule('${r.id}')">삭제</button>
              </div>
            `).join('')}
          </div>`}
      </div>
    `;
  },

  async templates() {
    const templates = await DB.getTemplates();
    const tpl = templates.find(t => t.is_default) || templates[0];
    const phases = ['수주','발주','청구'];
    const tabs = phases.map((ph, i) => `
      <button class="tab-btn ${i===0?'active':''}" data-ph="${ph}" onclick="Pages.showTplPhase('${ph}',this)">${ph} 프로세스</button>
    `).join('');

    const phaseHtml = (ph) => {
      const steps = tpl?.phases?.[ph] || [];
      return `<div class="timeline">${steps.map((s,i) => `
        <div class="timeline-item" style="cursor:default">
          <div class="tl-icon-wrap">
            <svg class="tl-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>
          </div>
          <div class="tl-card">
            <div style="padding:14px 18px;display:flex;align-items:center;gap:10px">
              <span class="tl-step-num">${String(i+1).padStart(2,'0')}</span>
              <span class="tl-step-name">${esc(s.name)}</span>
              <span class="tl-tag ${DIRECTION_CLASS[s.direction]||'dir-int'}">${DIRECTION_LABEL[s.direction]||''}</span>
              ${s.is_conditional ? `<span class="tl-tag cond">조건부</span>` : ''}
              ${s.is_conditional ? `<span style="font-size:11px;color:var(--s400)">${esc(s.condition_desc)}</span>` : ''}
            </div>
          </div>
        </div>
      `).join('')}</div>`;
    };

    return `
      <div class="section-header mb-3">
        <div class="section-title">기본 프로세스 템플릿</div>
        <div class="text-sm text-muted">새 사업 등록 시 자동 적용됩니다. 수정 후 저장하면 이후 사업에 반영됩니다.</div>
      </div>
      <div class="tab-bar" id="tpl-tabs">${tabs}</div>
      <div id="tpl-phase-content">${phaseHtml('수주')}</div>
    `;
  },

  async settings() {
    const settings = DB.getSettings();
    const all = await DB.getProjects();
    const alerts = [];
    for (const p of all) {
      const steps = await DB.getSteps(p.id);
      steps.forEach(s => {
        if (s.done || !s.due_date) return;
        const diff = daysDiff(s.due_date);
        if (diff < 0) alerts.push({ type: 'danger', project: p.name, step: s.name, diff, pid: p.id });
        else if (diff <= (settings.notifyDays||3)) alerts.push({ type: 'warning', project: p.name, step: s.name, diff, pid: p.id });
      });
    }
    const alertsHtml = alerts.length === 0
      ? `<div class="empty-state"><div class="empty-icon">🔕</div><h3>알림 없음</h3><p>마감 임박 항목이 없습니다.</p></div>`
      : alerts.map(a => `
        <div class="notif-item ${a.type}" style="cursor:pointer" onclick="App.navigate('project','${a.pid}')">
          <div class="notif-ico ${a.type}">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          </div>
          <div>
            <div class="notif-title">${esc(a.step)}</div>
            <div class="notif-desc">${esc(a.project)} · ${a.diff < 0 ? Math.abs(a.diff)+'일 초과' : a.diff === 0 ? '오늘 마감' : 'D-'+a.diff}</div>
          </div>
        </div>
      `).join('');

    return `
      <div style="display:grid;grid-template-columns:1fr 300px;gap:24px;align-items:start">
        <div>
          <div class="section-header mb-3">
            <div class="section-title">알림 현황 <span class="phase-pill" style="background:var(--red-light);color:var(--red)">${alerts.length}건</span></div>
          </div>
          ${alertsHtml}
        </div>
        <div style="background:#fff;border-radius:var(--r-lg);border:1px solid var(--s200);padding:22px;box-shadow:var(--shadow-sm)">
          <div class="section-title mb-3">알림 설정</div>
          <div class="form-field mb-3">
            <label class="form-label">
              <input type="checkbox" id="st-enabled" ${settings.notifyEnabled?'checked':''} style="margin-right:6px">
              브라우저 알림 활성화
            </label>
          </div>
          <div class="form-field mb-3">
            <label class="form-label">미리 알림 기간</label>
            <select class="form-select" id="st-days">
              ${[1,2,3,5,7,14].map(d=>`<option value="${d}" ${settings.notifyDays===d?'selected':''}>${d}일 전부터</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-primary w-full" onclick="App.saveSettings()">설정 저장</button>
          <div class="divider"></div>
          <button class="btn btn-secondary w-full" onclick="Notification.requestPermission().then(r=>Toast.show(r==='granted'?'알림 허용':'알림 차단',r==='granted'?'브라우저 알림이 활성화되었습니다.':'브라우저 설정에서 알림을 허용해 주세요.',r==='granted'?'success':'warning'))">
            브라우저 알림 권한 요청
          </button>
        </div>
      </div>
    `;
  },
};

// ── Phase switching ─────────────────────────────────────────────
App.switchPhase = async function(projectId, phase) {
  await DB.updateProject(projectId, { current_phase: phase });
  await App.navigate('project', projectId);
};

Pages.showTplPhase = function(ph, btn) {
  document.querySelectorAll('#tpl-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  DB.getTemplates().then(templates => {
    const tpl = templates.find(t => t.is_default) || templates[0];
    const steps = tpl?.phases?.[ph] || [];
    document.getElementById('tpl-phase-content').innerHTML = `<div class="timeline">${steps.map((s,i) => `
      <div class="timeline-item">
        <div class="tl-icon-wrap"><svg class="tl-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg></div>
        <div class="tl-card">
          <div style="padding:14px 18px;display:flex;align-items:center;gap:10px">
            <span class="tl-step-num">${String(i+1).padStart(2,'0')}</span>
            <span class="tl-step-name">${esc(s.name)}</span>
            <span class="tl-tag ${DIRECTION_CLASS[s.direction]||'dir-int'}">${DIRECTION_LABEL[s.direction]||''}</span>
            ${s.is_conditional ? `<span class="tl-tag cond">조건부 — ${esc(s.condition_desc)}</span>` : ''}
          </div>
        </div>
      </div>
    `).join('')}</div>`;
  });
};

// ── Project Card helper ────────────────────────────────────────
function projCard(p) {
  const col = PHASE_COLORS[p.current_phase] || 'blue';
  return `
    <div class="proj-card ${col}" data-proj-id="${p.id}">
      <div class="proj-card-top">
        <div>
          <div class="proj-card-title">${esc(p.name)}</div>
          <div class="proj-card-client">${esc(p.client || '고객사 미입력')}</div>
        </div>
        <span class="status-pill ${p.status}">${p.status}</span>
      </div>
      <div class="proj-meta">
        <span><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>${p.deadline || '납기 미정'}</span>
        ${p.amount ? `<span>💰 ${fmtAmt(p.amount)}원</span>` : ''}
        <span class="phase-pill ${col}" style="margin-left:auto">${p.current_phase}</span>
      </div>
    </div>
  `;
}

// localStorage shorthand for approval.js
const LS_GET = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
