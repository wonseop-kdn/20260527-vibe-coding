// ══════════════════════════════════════════════
//  Utility
// ══════════════════════════════════════════════
function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fmtDate(d){if(!d)return '';const dt=d instanceof Date?d:new Date(d);if(isNaN(dt))return String(d);return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;}
function fmtAmt(n){if(!n&&n!==0)return '';return Number(n).toLocaleString('ko-KR');}
function daysDiff(dateStr){if(!dateStr)return null;const d=new Date(dateStr);d.setHours(0,0,0,0);const t=new Date();t.setHours(0,0,0,0);return Math.round((d-t)/86400000);}
function duePill(step){
  if(step.done)return `<span class="tl-due done-sty">완료</span>`;
  if(!step.due_date)return `<span class="tl-due nodate">날짜 미정</span>`;
  const diff=daysDiff(step.due_date);
  if(diff<0)return `<span class="tl-due overdue">${Math.abs(diff)}일 초과</span>`;
  if(diff===0)return `<span class="tl-due overdue">오늘 마감</span>`;
  if(diff<=3)return `<span class="tl-due soon">D-${diff}</span>`;
  return `<span class="tl-due normal">${fmtDate(step.due_date)}</span>`;
}

// ══════════════════════════════════════════════
//  Toast
// ══════════════════════════════════════════════
const Toast={
  show(title,msg='',type='primary'){
    const icons={primary:'ℹ️',success:'✅',warning:'⚠️',danger:'🚨'};
    const el=document.createElement('div');
    el.className=`toast ${type}`;
    el.innerHTML=`<span class="toast-ico">${icons[type]||'ℹ️'}</span><div class="toast-content"><div class="toast-title">${esc(title)}</div><div class="toast-msg">${esc(msg)}</div></div>`;
    document.getElementById('toast-stack').appendChild(el);
    setTimeout(()=>{el.style.opacity='0';el.style.transform='translateX(20px)';setTimeout(()=>el.remove(),300);},4000);
  }
};

// ══════════════════════════════════════════════
//  Modal
// ══════════════════════════════════════════════
const Modal={
  open(title,body,size=''){
    document.getElementById('modal-title').textContent=title;
    document.getElementById('modal-body').innerHTML=body;
    document.getElementById('modal-box').className=`modal-box ${size}`;
    document.getElementById('modal-backdrop').style.display='flex';
  },
  close(){document.getElementById('modal-backdrop').style.display='none';}
};

// ══════════════════════════════════════════════
//  App
// ══════════════════════════════════════════════
const App={
  currentProjectId:null,
  currentProjectName:'',

  // ─── init ───
  async init(){
    // Register service worker
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    }
    initDB();
    this.bindNav();
    this.bindModal();
    document.getElementById('btn-new-project').addEventListener('click',()=>App.showNewProjectModal());
    document.getElementById('sidebar-toggle').addEventListener('click',()=>App.toggleSidebar());

    // Landing search
    const inp=document.getElementById('landing-search');
    if(inp){
      inp.addEventListener('input',()=>App.filterLanding(inp.value));
      inp.addEventListener('keydown',e=>{if(e.key==='Enter')App.landingEnter();});
    }

    await App.loadLandingProjects();
  },

  toggleSidebar(){
    const sb=document.getElementById('sidebar');
    const main=document.getElementById('main-area');
    if(window.innerWidth<900){sb.classList.toggle('mobile-open');}
    else{sb.classList.toggle('collapsed');main.classList.toggle('expanded');}
  },

  bindNav(){
    document.querySelectorAll('.nav-item[data-page]').forEach(el=>{
      el.addEventListener('click',e=>{e.preventDefault();App.navigate(el.dataset.page);});
    });
  },

  bindModal(){
    document.getElementById('modal-close').addEventListener('click',Modal.close);
    document.getElementById('modal-backdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)Modal.close();});
  },

  // ─── Landing ───
  showLanding(){
    document.getElementById('app').style.display='none';
    document.getElementById('landing').style.display='flex';
    document.getElementById('chatbot-fab').style.display='none';
    App.loadLandingProjects();
  },

  async loadLandingProjects(){
    try{
      const projects=await DB.getProjects();
      const grid=document.getElementById('landing-projects');
      if(!grid)return;
      if(projects.length===0){
        grid.innerHTML=`<div style="text-align:center;color:#64748B;padding:20px;font-size:13px;grid-column:1/-1">등록된 사업이 없습니다</div>`;
        return;
      }
      grid.innerHTML=projects.slice(0,6).map(p=>`
        <div class="landing-proj-card" onclick="App.enterProject('${p.id}','${esc(p.name)}')">
          <div class="lp-phase-dot ${PHASE_COLORS[p.current_phase]||'blue'}"></div>
          <div class="lp-info">
            <div class="lp-name">${esc(p.name)}</div>
            <div class="lp-meta">${esc(p.client||'고객사 미입력')} · <span class="phase-pill ${PHASE_COLORS[p.current_phase]||'blue'}">${p.current_phase}</span></div>
          </div>
          <span class="status-pill ${p.status}">${p.status}</span>
        </div>
      `).join('');
    }catch(e){console.error(e);}
  },

  filterLanding(q){
    const dd=document.getElementById('landing-dropdown');
    if(!q.trim()){dd.style.display='none';return;}
    DB.getProjects().then(projects=>{
      const matched=projects.filter(p=>p.name.toLowerCase().includes(q.toLowerCase())||p.client?.toLowerCase().includes(q.toLowerCase()));
      if(matched.length===0){dd.style.display='none';return;}
      dd.innerHTML=matched.slice(0,5).map(p=>`
        <div class="landing-dd-item" onclick="App.enterProject('${p.id}','${esc(p.name)}')">
          <span class="landing-dd-phase ${PHASE_COLORS[p.current_phase]||'blue'}">${p.current_phase}</span>
          ${esc(p.name)}
        </div>
      `).join('');
      dd.style.display='block';
    });
  },

  async landingEnter(){
    const q=document.getElementById('landing-search').value.trim();
    if(!q)return;
    const projects=await DB.getProjects();
    const found=projects.find(p=>p.name.toLowerCase()===q.toLowerCase());
    if(found){App.enterProject(found.id,found.name);}
    else{
      // Create new project with this name
      App._pendingProjectName=q;
      App.showNewProjectModal(q);
    }
  },

  enterProject(id,name){
    App.currentProjectId=id;
    App.currentProjectName=name;
    // Show app
    document.getElementById('landing').style.display='none';
    document.getElementById('app').style.display='flex';
    document.getElementById('chatbot-fab').style.display='flex';
    // Update sidebar badge
    const badge=document.getElementById('sb-project-badge');
    if(badge){badge.style.display='block';}
    const nameEl=document.getElementById('sb-proj-name');
    if(nameEl)nameEl.textContent=name;
    // Navigate to project detail
    App.navigate('project',id);
    App.updateNavCounts();
    App.checkAlerts();
    Chatbot.init();
  },

  // ─── Navigate ───
  async navigate(page,param){
    document.querySelectorAll('.nav-item[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===page));
    const content=document.getElementById('page-content');
    const bc=document.getElementById('breadcrumb');

    try{
      if(page==='dashboard'){
        bc.innerHTML='<span class="crumb-current">대시보드</span>';
        content.innerHTML=await Pages.dashboard();
      } else if(page.startsWith('process-')){
        const phase=page.split('-')[1];
        bc.innerHTML=`<span>프로세스</span><span class="crumb-sep">›</span><span class="crumb-current">${phase}</span>`;
        content.innerHTML=await Pages.processView(phase);
      } else if(page==='project'){
        const pid=param||App.currentProjectId;
        if(!pid){App.navigate('dashboard');return;}
        const p=await DB.getProject(pid);
        bc.innerHTML=`<a href="#" onclick="App.navigate('dashboard');return false" style="color:var(--s500)">대시보드</a><span class="crumb-sep">›</span><span class="crumb-current">${esc(p?.name||'')}</span>`;
        content.innerHTML=await Pages.projectDetail(pid);
      } else if(page==='calendar'){
        bc.innerHTML='<span class="crumb-current">일정 캘린더</span>';
        content.innerHTML=await Pages.calendar();
      } else if(page==='notifications'){
        bc.innerHTML='<span class="crumb-current">알림 설정</span>';
        content.innerHTML=await Pages.notifications();
      } else if(page==='regulations'){
        bc.innerHTML='<span class="crumb-current">사규 관리</span>';
        content.innerHTML=await Pages.regulations();
      } else if(page==='feedback'){
        bc.innerHTML='<span class="crumb-current">요청사항</span>';
        content.innerHTML=await Pages.feedback();
      }
    }catch(err){
      console.error('Navigate error:',err);
      content.innerHTML=`<div class="empty-state"><h3>페이지 로드 오류</h3><p>${esc(err.message)}</p></div>`;
    }

    // Re-bind project card clicks
    document.querySelectorAll('[data-proj-id]').forEach(el=>{
      el.addEventListener('click',()=>App.enterProject(el.dataset.projId,el.dataset.projName||''));
    });
  },

  // ─── Counts ───
  async updateNavCounts(){
    try{
      const projects=await DB.getProjects();
      for(const ph of ['수주','발주','청구']){
        const el=document.getElementById(`cnt-${ph}`);
        const cnt=projects.filter(p=>p.current_phase===ph&&p.status!=='완료').length;
        if(el)el.textContent=cnt>0?cnt:'';
      }
      // feedback count
      const fb=LS.get('bm_feedback',[]).filter(f=>f.status==='pending').length;
      const fEl=document.getElementById('cnt-feedback');
      if(fEl)fEl.textContent=fb>0?fb:'';
    }catch(e){}
  },

  // ─── Alerts ───
  async checkAlerts(){
    try{
      const projects=await DB.getProjects();
      const settings=DB.getSettings();
      const alerts=[];
      for(const p of projects){
        const steps=await DB.getSteps(p.id);
        steps.forEach(s=>{
          if(s.done||!s.due_date)return;
          const diff=daysDiff(s.due_date);
          if(diff<0)alerts.push({type:'danger',project:p.name,step:s.name,diff,pid:p.id});
          else if(diff<=(settings.notifyDays||3))alerts.push({type:'warning',project:p.name,step:s.name,diff,pid:p.id});
        });
      }
      const strip=document.getElementById('alert-strip');
      const cntEl=document.getElementById('cnt-notif');
      if(alerts.length>0){
        const ov=alerts.filter(a=>a.type==='danger').length;
        const up=alerts.filter(a=>a.type==='warning').length;
        let msg='🔔 ';
        if(ov>0)msg+=`<strong>${ov}건 기한 초과</strong>  `;
        if(up>0)msg+=`<strong>${up}건 마감 임박</strong>  `;
        msg+=`<a href="#" onclick="App.navigate('notifications');return false" style="color:#78350F;font-weight:700;text-decoration:underline">알림 목록 →</a>`;
        if(strip){strip.innerHTML=msg;strip.style.display='flex';}
        if(cntEl){cntEl.textContent=alerts.length;cntEl.style.display='';}
      } else {
        if(strip)strip.style.display='none';
        if(cntEl)cntEl.textContent='';
      }

      // Check scheduled custom notifications
      App.fireScheduledNotifs();
    }catch(e){}
  },

  fireScheduledNotifs(){
    const notifs=LS.get('bm_custom_notifs',[]);
    const now=new Date();
    notifs.forEach(n=>{
      if(n.is_fired||!n.is_active)return;
      const scheduled=new Date(n.scheduled_at);
      if(scheduled<=now){
        Toast.show(n.title,n.message,'warning');
        if(Notification.permission==='granted'){
          new Notification(n.title,{body:n.message,icon:'icon-192.png'});
        }
        n.is_fired=true;
        // Schedule via SW for future
      }
    });
    LS.set('bm_custom_notifs',notifs);

    // Schedule future ones via service worker
    if('serviceWorker' in navigator){
      navigator.serviceWorker.ready.then(reg=>{
        const future=notifs.filter(n=>!n.is_fired&&n.is_active&&new Date(n.scheduled_at)>now);
        future.forEach(n=>{
          reg.active?.postMessage({type:'SCHEDULE_NOTIFICATION',id:n.id,title:n.title,body:n.message,scheduledTime:new Date(n.scheduled_at).getTime()});
        });
      }).catch(()=>{});
    }
  },

  // ══════════════════════════════════════════
  //  NEW PROJECT MODAL — fixed
  // ══════════════════════════════════════════
  showNewProjectModal(prefillName=''){
    Modal.open('새 사업 등록',`
      <div class="tab-bar" id="np-tabs">
        <button class="tab-btn active" data-tab="manual">직접 입력</button>
        <button class="tab-btn" data-tab="spec">구매규격 분석 <span class="ai-badge">AI</span></button>
      </div>

      <!-- Manual tab -->
      <div id="tab-manual">
        <div class="form-grid cols-2">
          <div class="form-field full">
            <label class="form-label">사업명 <span class="req">*</span></label>
            <input type="text" class="form-input" id="np-name" placeholder="예) 2026년 전력ICT 인프라 구축사업" value="${esc(prefillName)}">
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
            <label class="form-label">시작 단계</label>
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
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="Modal.close()">취소</button>
          <button type="button" class="btn btn-primary" id="np-submit-btn" onclick="App.createProject()">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
            사업 등록
          </button>
        </div>
      </div>

      <!-- Spec tab -->
      <div id="tab-spec" style="display:none">
        <div class="form-field mb-3">
          <label class="form-label">구매규격서 / 과업지시서 내용 붙여넣기</label>
          <textarea class="form-textarea" id="spec-input" style="min-height:160px" placeholder="구매규격서나 과업지시서 전체 내용을 복사해서 붙여넣으면 납기, 시운전 기간, 제출서류 등을 자동 분석합니다..."></textarea>
        </div>
        <button type="button" class="btn btn-primary mb-3" onclick="App.runSpecAnalysis()">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/></svg>
          AI 분석 시작
        </button>
        <div id="spec-result-area"></div>
      </div>
    `,'modal-lg');

    // Tab switching
    document.querySelectorAll('#np-tabs .tab-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        document.querySelectorAll('#np-tabs .tab-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-manual').style.display=btn.dataset.tab==='manual'?'':'none';
        document.getElementById('tab-spec').style.display=btn.dataset.tab==='spec'?'':'none';
      });
    });
    if(prefillName)setTimeout(()=>document.getElementById('np-name')?.focus(),100);
  },

  // ─── Create project ───
  async createProject(){
    const btn=document.getElementById('np-submit-btn');
    if(btn){btn.disabled=true;btn.textContent='등록 중…';}
    try{
      const name=document.getElementById('np-name')?.value.trim();
      if(!name){Toast.show('필수 입력','사업명을 입력해 주세요.','warning');return;}
      const phase=document.getElementById('np-phase')?.value||'수주';
      const amount=document.getElementById('np-amount')?.value||'0';
      const project={
        id:DB.uid(),name,
        client:document.getElementById('np-client')?.value||'',
        manager:document.getElementById('np-manager')?.value||'',
        amount:parseInt(amount)||0,
        current_phase:phase,
        contract_date:document.getElementById('np-contract')?.value||null,
        deadline:document.getElementById('np-deadline')?.value||null,
        status:'진행중',
        memo:document.getElementById('np-memo')?.value||'',
        created_at:new Date().toISOString()
      };
      const needsReview=project.amount>=200000000;
      const saved=await DB.addProject(project);
      await App._createDefaultSteps(saved.id||project.id,phase,project.contract_date,needsReview);
      Modal.close();
      App.enterProject(saved.id||project.id,name);
      Toast.show('등록 완료',`"${name}" 사업이 등록되었습니다.`,'success');
      if(needsReview)Toast.show('심의회 필요','수주금액 2억 이상 — 전력ICT사업 심의회가 포함되었습니다.','warning');
    }catch(err){
      console.error('createProject error:',err);
      Toast.show('오류 발생',`사업 등록 실패: ${err.message}`,'danger');
    }finally{
      if(btn){btn.disabled=false;btn.textContent='사업 등록';}
    }
  },

  async _createDefaultSteps(projectId,phase,contractDate,needsReview){
    const templates=await DB.getTemplates();
    const tpl=templates.find(t=>t.is_default)||templates[0];
    if(!tpl)return;
    const allPhases=phase==='수주'?['수주','발주','청구']:phase==='발주'?['발주','청구']:['청구'];
    let idx=0;
    for(const ph of allPhases){
      const phSteps=tpl.phases?.[ph]||[];
      for(const s of phSteps){
        if(ph==='수주'&&s.document_type==='심의회 결과보고'&&!needsReview){idx++;continue;}
        await DB.addStep({
          id:DB.uid(),project_id:projectId,phase:ph,
          name:s.name,document_type:s.document_type||'',direction:s.direction||'internal',
          category:s.category||'',approver:s.approver||'',approval_level:s.approval_level||'',
          requires_audit:s.requires_audit||false,regulation_ref:s.regulation_ref||'',
          is_conditional:s.is_conditional||false,condition_desc:s.condition_desc||'',
          done:false,due_date:null,notes:s.notes||'',order_index:idx++
        });
      }
    }
  },

  runSpecAnalysis(){
    const text=document.getElementById('spec-input')?.value.trim();
    if(!text){Toast.show('입력 필요','구매규격 내용을 붙여넣어 주세요.','warning');return;}
    const area=document.getElementById('spec-result-area');
    area.innerHTML=`<div class="loading-row"><div class="spinner"></div> 구매규격 분석 중…</div>`;
    setTimeout(()=>{
      const r=SpecAnalyzer.analyze(text);
      App._specAnalysis=r;
      const fields=Object.entries(r.extractedFields).map(([k,v])=>`
        <div class="spec-result-item">
          <div class="spec-item-label">${esc(v.label)}</div>
          <div class="spec-item-value ${v.value?'':'not-found'}">${esc(v.value||'명시되지 않음')}</div>
        </div>`).join('');
      const docs=r.detectedDocuments.length>0?r.detectedDocuments.map(d=>`
        <div class="checklist-item"><input type="checkbox" checked><span>${esc(d)}</span></div>`).join('')
        :'<div style="color:var(--s400);font-size:13px">명시된 제출 서류가 없습니다</div>';
      area.innerHTML=`
        <div class="ai-box">
          <div class="ai-box-title">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/></svg>
            AI 분석 완료 ${r.amount?`<span style="font-size:11px;font-weight:400">추정금액: ${esc(r.amount)}</span>`:''}
          </div>
          <div class="spec-result-grid">${fields}</div>
          <div class="checklist-wrap mt-3">
            <div class="checklist-title">📋 감지된 제출 서류 (${r.detectedDocuments.length}건)</div>${docs}
          </div>
          <div class="divider"></div>
          <div class="form-grid cols-2 mt-3">
            <div class="form-field full"><label class="form-label">사업명 <span class="req">*</span></label>
              <input type="text" class="form-input" id="spec-name" placeholder="사업명 입력"></div>
            <div class="form-field"><label class="form-label">고객사</label>
              <input type="text" class="form-input" id="spec-client"></div>
            <div class="form-field"><label class="form-label">시작 단계</label>
              <select class="form-select" id="spec-phase">
                <option value="수주">수주</option><option value="발주">발주</option><option value="청구">청구</option>
              </select></div>
          </div>
          <div class="modal-footer" style="padding:14px 0 0">
            <button type="button" class="btn btn-secondary" onclick="Modal.close()">취소</button>
            <button type="button" class="btn btn-primary" onclick="App.createProjectFromSpec()">이 분석으로 등록</button>
          </div>
        </div>`;
    },700);
  },

  async createProjectFromSpec(){
    const name=document.getElementById('spec-name')?.value.trim();
    if(!name){Toast.show('필수 입력','사업명을 입력해 주세요.','warning');return;}
    try{
      const r=App._specAnalysis;
      const phase=document.getElementById('spec-phase')?.value||'수주';
      const project={id:DB.uid(),name,client:document.getElementById('spec-client')?.value||'',amount:0,current_phase:phase,status:'진행중',memo:'구매규격 자동 분석',created_at:new Date().toISOString()};
      const saved=await DB.addProject(project);
      await App._createDefaultSteps(saved.id||project.id,phase,null,false);
      Modal.close();
      App.enterProject(saved.id||project.id,name);
      Toast.show('등록 완료',`"${name}" 사업이 등록되었습니다.`,'success');
    }catch(err){Toast.show('오류',err.message,'danger');}
  },

  // ─── Edit project ───
  async showEditProject(id){
    const p=await DB.getProject(id);
    Modal.open('사업 정보 수정',`
      <div class="form-grid cols-2">
        <div class="form-field full"><label class="form-label">사업명</label>
          <input type="text" class="form-input" id="ep-name" value="${esc(p.name)}"></div>
        <div class="form-field"><label class="form-label">고객사</label>
          <input type="text" class="form-input" id="ep-client" value="${esc(p.client||'')}"></div>
        <div class="form-field"><label class="form-label">담당자</label>
          <input type="text" class="form-input" id="ep-manager" value="${esc(p.manager||'')}"></div>
        <div class="form-field"><label class="form-label">계약금액 (원)</label>
          <input type="number" class="form-input" id="ep-amount" value="${p.amount||''}"></div>
        <div class="form-field"><label class="form-label">현재 단계</label>
          <select class="form-select" id="ep-phase">${['수주','발주','청구'].map(ph=>`<option value="${ph}" ${p.current_phase===ph?'selected':''}>${ph}</option>`).join('')}</select></div>
        <div class="form-field"><label class="form-label">상태</label>
          <select class="form-select" id="ep-status">${['대기','진행중','완료','보류'].map(s=>`<option value="${s}" ${p.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
        <div class="form-field"><label class="form-label">계약일</label>
          <input type="date" class="form-input" id="ep-contract" value="${p.contract_date||''}"></div>
        <div class="form-field"><label class="form-label">납기일</label>
          <input type="date" class="form-input" id="ep-deadline" value="${p.deadline||''}"></div>
        <div class="form-field full"><label class="form-label">비고</label>
          <textarea class="form-textarea" id="ep-memo">${esc(p.memo||'')}</textarea></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="Modal.close()">취소</button>
        <button type="button" class="btn btn-primary" onclick="App.saveEditProject('${id}')">저장</button>
      </div>`);
  },

  async saveEditProject(id){
    try{
      await DB.updateProject(id,{
        name:document.getElementById('ep-name').value,
        client:document.getElementById('ep-client').value,
        manager:document.getElementById('ep-manager').value,
        amount:parseInt(document.getElementById('ep-amount').value)||0,
        current_phase:document.getElementById('ep-phase').value,
        status:document.getElementById('ep-status').value,
        contract_date:document.getElementById('ep-contract').value||null,
        deadline:document.getElementById('ep-deadline').value||null,
        memo:document.getElementById('ep-memo').value
      });
      Modal.close();
      App.navigate('project',id);
      Toast.show('수정 완료','사업 정보가 저장되었습니다.','success');
    }catch(err){Toast.show('오류',err.message,'danger');}
  },

  async deleteProject(id){
    if(!confirm('정말 삭제하시겠습니까? 모든 프로세스 단계도 삭제됩니다.'))return;
    await DB.deleteProject(id);
    App.showLanding();
    Toast.show('삭제 완료','사업이 삭제되었습니다.','primary');
  },

  // ─── Steps ───
  async toggleStep(stepId,projectId){
    try{
      const steps=await DB.getSteps(projectId);
      const step=steps.find(s=>s.id===stepId);
      if(!step)return;
      await DB.updateStep(stepId,{done:!step.done,done_at:!step.done?new Date().toISOString():null});
      App.navigate('project',projectId);
      App.checkAlerts();
    }catch(err){Toast.show('오류',err.message,'danger');}
  },

  async saveStepDue(stepId,projectId){
    const val=document.getElementById(`due-${stepId}`)?.value;
    try{await DB.updateStep(stepId,{due_date:val||null});App.navigate('project',projectId);App.checkAlerts();Toast.show('저장됨','마감일이 저장되었습니다.','success');}
    catch(err){Toast.show('오류',err.message,'danger');}
  },

  async saveStepNote(stepId,projectId){
    const val=document.getElementById(`note-${stepId}`)?.value;
    try{await DB.updateStep(stepId,{notes:val});Toast.show('저장됨','메모가 저장되었습니다.','success');}
    catch(err){Toast.show('오류',err.message,'danger');}
  },

  async deleteStep(stepId,projectId){
    if(!confirm('이 단계를 삭제하시겠습니까?'))return;
    await DB.deleteStep(stepId);
    App.navigate('project',projectId);
    Toast.show('삭제됨','단계가 삭제되었습니다.','primary');
  },

  async showAddStep(projectId,phase){
    Modal.open('단계 추가',`
      <div class="form-grid cols-2">
        <div class="form-field full"><label class="form-label">단계명 <span class="req">*</span></label>
          <input type="text" class="form-input" id="as-name" placeholder="예) 착수신고서 제출"></div>
        <div class="form-field"><label class="form-label">문서 유형</label>
          <input type="text" class="form-input" id="as-doctype" placeholder="예) 공문, 보고서"></div>
        <div class="form-field"><label class="form-label">방향</label>
          <select class="form-select" id="as-dir">
            <option value="internal">내부</option><option value="outgoing">발신 (→ 외부)</option><option value="incoming">수신 (← 외부)</option>
          </select></div>
        <div class="form-field"><label class="form-label">단계</label>
          <select class="form-select" id="as-phase">${['수주','발주','청구'].map(ph=>`<option value="${ph}" ${ph===phase?'selected':''}>${ph}</option>`).join('')}</select></div>
        <div class="form-field"><label class="form-label">마감일</label>
          <input type="date" class="form-input" id="as-due"></div>
        <div class="form-field full"><label class="form-label">메모</label>
          <textarea class="form-textarea" id="as-notes"></textarea></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="Modal.close()">취소</button>
        <button type="button" class="btn btn-primary" onclick="App.saveAddStep('${projectId}')">추가</button>
      </div>`);
  },

  async saveAddStep(projectId){
    const name=document.getElementById('as-name')?.value.trim();
    if(!name){Toast.show('필수 입력','단계명을 입력해 주세요.','warning');return;}
    try{
      const steps=await DB.getSteps(projectId);
      const phase=document.getElementById('as-phase').value;
      await DB.addStep({
        id:DB.uid(),project_id:projectId,phase,name,
        document_type:document.getElementById('as-doctype').value,
        direction:document.getElementById('as-dir').value,
        category:'',approver:'',approval_level:'',requires_audit:false,regulation_ref:'',
        is_conditional:false,condition_desc:'',done:false,
        due_date:document.getElementById('as-due').value||null,
        notes:document.getElementById('as-notes').value,
        order_index:steps.filter(s=>s.phase===phase).length
      });
      Modal.close();
      App.navigate('project',projectId);
      Toast.show('추가됨',`"${name}" 단계가 추가되었습니다.`,'success');
    }catch(err){Toast.show('오류',err.message,'danger');}
  },

  async editStepApproval(stepId){
    const steps=LS.get('bm_steps',[]);
    const step=steps.find(s=>s.id===stepId)||{};
    Modal.open('결재 정보 설정',`
      ${Approval.editForm(step)}
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="Modal.close()">취소</button>
        <button type="button" class="btn btn-primary" onclick="App.saveApproval('${stepId}')">저장</button>
      </div>`);
  },

  async saveApproval(stepId){
    try{
      await DB.updateStep(stepId,{
        approver:document.getElementById('apr-approver').value,
        approval_level:document.getElementById('apr-level').value,
        requires_audit:document.getElementById('apr-audit').checked,
        regulation_ref:document.getElementById('apr-ref').value
      });
      const step=LS.get('bm_steps',[]).find(s=>s.id===stepId);
      Modal.close();
      if(step)App.navigate('project',step.project_id);
      Toast.show('저장됨','결재 정보가 저장되었습니다.','success');
    }catch(err){Toast.show('오류',err.message,'danger');}
  },

  // ─── Regulations ───
  async showAddRegulation(){
    Modal.open('사규 추가',`
      <div class="form-grid">
        <div class="form-field full"><label class="form-label">규정명 <span class="req">*</span></label>
          <input type="text" class="form-input" id="reg-title" placeholder="예) 계약업무 처리규정"></div>
        <div class="form-field"><label class="form-label">버전</label>
          <input type="text" class="form-input" id="reg-version" placeholder="예) 2024.1"></div>
        <div class="form-field full"><label class="form-label">규정 내용 (핵심 조항 요약 또는 전문)</label>
          <textarea class="form-textarea" id="reg-content" style="min-height:180px" placeholder="결재권자, 금액 기준, 핵심 조항 등 입력..."></textarea></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="Modal.close()">취소</button>
        <button type="button" class="btn btn-primary" onclick="App.saveRegulation()">저장</button>
      </div>`);
  },

  async saveRegulation(){
    const title=document.getElementById('reg-title')?.value.trim();
    if(!title){Toast.show('필수 입력','규정명을 입력해 주세요.','warning');return;}
    try{
      await DB.addRegulation({id:DB.uid(),title,version:document.getElementById('reg-version').value,content:document.getElementById('reg-content').value,created_at:new Date().toISOString()});
      Modal.close();App.navigate('regulations');
      Toast.show('추가됨','사규가 추가되었습니다.','success');
    }catch(err){Toast.show('오류',err.message,'danger');}
  },

  async deleteRegulation(id){
    if(!confirm('삭제하시겠습니까?'))return;
    await DB.deleteRegulation(id);App.navigate('regulations');
  },

  async showAddApprovalRule(){
    Modal.open('결재 규정 추가',`
      <div class="form-grid cols-2">
        <div class="form-field full"><label class="form-label">문서 유형 <span class="req">*</span></label>
          <input type="text" class="form-input" id="ar-doctype" placeholder="예) 수주추진보고, 발주의뢰"></div>
        <div class="form-field full"><label class="form-label">설명</label>
          <input type="text" class="form-input" id="ar-desc"></div>
        <div class="form-field"><label class="form-label">금액 하한 (원)</label>
          <input type="number" class="form-input" id="ar-min" value="0"></div>
        <div class="form-field"><label class="form-label">금액 상한 (비우면 무제한)</label>
          <input type="number" class="form-input" id="ar-max"></div>
        <div class="form-field"><label class="form-label">결재권자 <span class="req">*</span></label>
          <input type="text" class="form-input" id="ar-approver" placeholder="예) 팀장, 부서장"></div>
        <div class="form-field"><label class="form-label">결재 단계</label>
          <input type="text" class="form-input" id="ar-level" placeholder="예) 전결, 합의"></div>
        <div class="form-field full"><label class="form-label"><input type="checkbox" id="ar-audit" style="margin-right:6px">감사 부서 합의 필요</label></div>
        <div class="form-field full"><label class="form-label">메모 / 사규 조항</label>
          <input type="text" class="form-input" id="ar-notes" placeholder="예) 계약업무처리규정 제15조"></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="Modal.close()">취소</button>
        <button type="button" class="btn btn-primary" onclick="App.saveApprovalRule()">저장</button>
      </div>`);
  },

  async saveApprovalRule(){
    const docType=document.getElementById('ar-doctype')?.value.trim();
    const approver=document.getElementById('ar-approver')?.value.trim();
    if(!docType||!approver){Toast.show('필수 입력','문서 유형과 결재권자를 입력해 주세요.','warning');return;}
    try{
      const max=document.getElementById('ar-max').value;
      await DB.addApprovalRule({id:DB.uid(),document_type:docType,description:document.getElementById('ar-desc').value,amount_min:parseInt(document.getElementById('ar-min').value)||0,amount_max:max?parseInt(max):null,approver,approval_level:document.getElementById('ar-level').value,requires_audit:document.getElementById('ar-audit').checked,notes:document.getElementById('ar-notes').value,created_at:new Date().toISOString()});
      Modal.close();App.navigate('regulations');
      Toast.show('추가됨','결재 규정이 추가되었습니다.','success');
    }catch(err){Toast.show('오류',err.message,'danger');}
  },

  async deleteApprovalRule(id){
    if(!confirm('삭제하시겠습니까?'))return;
    await DB.deleteApprovalRule(id);App.navigate('regulations');
  },

  // ─── Custom Notifications ───
  async addCustomNotif(){
    const title=document.getElementById('cn-title')?.value.trim();
    const msg=document.getElementById('cn-msg')?.value.trim();
    const dt=document.getElementById('cn-datetime')?.value;
    if(!title||!dt){Toast.show('필수 입력','제목과 날짜/시간을 입력해 주세요.','warning');return;}
    const notifs=LS.get('bm_custom_notifs',[]);
    const n={id:DB.uid(),title,message:msg||'',scheduled_at:new Date(dt).toISOString(),is_fired:false,is_active:true,created_at:new Date().toISOString()};
    notifs.push(n);
    LS.set('bm_custom_notifs',notifs);
    // Schedule via SW
    if('serviceWorker' in navigator){
      navigator.serviceWorker.ready.then(reg=>{
        reg.active?.postMessage({type:'SCHEDULE_NOTIFICATION',id:n.id,title:n.title,body:n.message,scheduledTime:new Date(n.scheduled_at).getTime()});
      });
    }
    if(Notification.permission!=='granted')Notification.requestPermission();
    document.getElementById('cn-title').value='';
    document.getElementById('cn-msg').value='';
    document.getElementById('cn-datetime').value='';
    App.navigate('notifications');
    Toast.show('알림 등록','지정한 시간에 알림이 울립니다.','success');
  },

  deleteCustomNotif(id){
    const notifs=LS.get('bm_custom_notifs',[]).filter(n=>n.id!==id);
    LS.set('bm_custom_notifs',notifs);App.navigate('notifications');
  },

  // ─── Feedback ───
  async addFeedback(){
    const title=document.getElementById('fb-title')?.value.trim();
    const desc=document.getElementById('fb-desc')?.value.trim();
    const priority=document.getElementById('fb-priority')?.value||'normal';
    const cat=document.getElementById('fb-cat')?.value||'기능개선';
    if(!title){Toast.show('필수 입력','요청 제목을 입력해 주세요.','warning');return;}
    try{
      const fb=LS.get('bm_feedback',[]);
      fb.unshift({id:DB.uid(),title,description:desc,priority,category:cat,status:'pending',created_at:new Date().toISOString()});
      LS.set('bm_feedback',fb);
      App.navigate('feedback');App.updateNavCounts();
      Toast.show('등록됨','요청사항이 등록되었습니다.','success');
    }catch(err){Toast.show('오류',err.message,'danger');}
  },

  updateFeedbackStatus(id,status){
    const fb=LS.get('bm_feedback',[]).map(f=>f.id===id?{...f,status}:f);
    LS.set('bm_feedback',fb);App.navigate('feedback');App.updateNavCounts();
  },

  deleteFeedback(id){
    if(!confirm('삭제하시겠습니까?'))return;
    LS.set('bm_feedback',LS.get('bm_feedback',[]).filter(f=>f.id!==id));
    App.navigate('feedback');App.updateNavCounts();
  },

  // ─── Export/Import ───
  async exportData(){
    try{
      const data=await DB.exportAll();
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`KDN사업관리_${fmtDate(new Date())}.json`;a.click();
      Toast.show('내보내기 완료','데이터가 저장되었습니다.','success');
    }catch(err){Toast.show('오류',err.message,'danger');}
  },

  importData(){
    const input=document.createElement('input');input.type='file';input.accept='.json';
    input.onchange=async e=>{
      const file=e.target.files[0];if(!file)return;
      try{const data=JSON.parse(await file.text());await DB.importAll(data);App.navigate('dashboard');App.updateNavCounts();Toast.show('가져오기 완료','데이터가 복원되었습니다.','success');}
      catch{Toast.show('오류','올바르지 않은 파일 형식입니다.','danger');}
    };input.click();
  },

  switchPhase(projectId,phase){DB.updateProject(projectId,{current_phase:phase}).then(()=>App.navigate('project',projectId));},
  saveSettings(){const d=parseInt(document.getElementById('st-days')?.value)||3;const e=document.getElementById('st-enabled')?.checked;DB.saveSettings({notifyDays:d,notifyEnabled:e});App.checkAlerts();Toast.show('저장됨','설정이 저장되었습니다.','success');}
};

// ══════════════════════════════════════════════
//  Pages
// ══════════════════════════════════════════════
const Pages={

  // ─── Dashboard ───
  async dashboard(){
    const projects=await DB.getProjects();
    const today=new Date();today.setHours(0,0,0,0);
    const allSteps=[];
    for(const p of projects){
      const steps=await DB.getSteps(p.id);
      steps.forEach(s=>allSteps.push({...s,_proj:p}));
    }
    const overdue=allSteps.filter(s=>!s.done&&s.due_date&&new Date(s.due_date)<today);
    const upcoming=allSteps.filter(s=>{if(s.done||!s.due_date)return false;const d=daysDiff(s.due_date);return d>=0&&d<=7;}).sort((a,b)=>new Date(a.due_date)-new Date(b.due_date));
    const alertItems=[...overdue,...upcoming.slice(0,4)].slice(0,6).map(s=>{
      const diff=s.due_date?daysDiff(s.due_date):null;
      const type=diff!==null&&diff<0?'danger':'warning';
      const msg=diff===null?'':`${diff<0?Math.abs(diff)+'일 초과':diff===0?'오늘 마감':'D-'+diff}`;
      return `<div class="notif-item ${type}" style="cursor:pointer" onclick="App.navigate('project','${s._proj.id}')">
        <div class="notif-ico ${type}"><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg></div>
        <div><div class="notif-title">${esc(s.name)}</div><div class="notif-desc">${esc(s._proj.name)} · ${msg}</div></div>
      </div>`;
    }).join('');
    return `
      <div class="kpi-grid">
        ${['수주','발주','청구'].map(ph=>{
          const col=PHASE_COLORS[ph];
          const cnt=projects.filter(p=>p.current_phase===ph).length;
          return `<div class="kpi-card ${col}" style="cursor:pointer" onclick="App.navigate('process-${ph}')">
            <div class="kpi-top"><div class="kpi-icon ${col}"><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6z" clip-rule="evenodd"/></svg></div>
            <span class="phase-pill ${col}">${ph}</span></div>
            <div class="kpi-value">${cnt}</div><div class="kpi-label">${ph} 사업</div></div>`;
        }).join('')}
        <div class="kpi-card red">
          <div class="kpi-top"><div class="kpi-icon red"><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92z" clip-rule="evenodd"/></svg></div></div>
          <div class="kpi-value">${overdue.length}</div><div class="kpi-label">기한 초과</div>
        </div>
      </div>
      ${alertItems?`<div class="section-header mt-4"><div class="section-title">🔔 주요 알림</div></div><div style="display:flex;flex-direction:column;gap:6px;margin-bottom:24px">${alertItems}</div>`:''}
      <div class="section-header mt-2">
        <div class="section-title">전체 사업 현황</div>
        <button class="btn btn-ghost btn-sm" onclick="App.showLanding()">사업 선택</button>
      </div>
      ${projects.length===0?`<div class="empty-state"><div class="empty-icon">📋</div><h3>등록된 사업이 없습니다</h3><p>새 사업 등록을 눌러 시작해 보세요.</p></div>`
      :`<div class="projects-grid">${projects.map(p=>projCard(p)).join('')}</div>`}`;
  },

  // ─── Process view (phase focused) ───
  async processView(phase){
    const projects=await DB.getProjects();
    const col=PHASE_COLORS[phase]||'blue';
    const html=await Promise.all(projects.map(async p=>{
      const steps=(await DB.getSteps(p.id)).filter(s=>s.phase===phase);
      if(steps.length===0)return'';
      const done=steps.filter(s=>s.done).length;
      const pct=Math.round(done/steps.length*100);
      const stepsHtml=steps.map((s,i)=>Pages.renderStepCompact(s,i,p.id,phase)).join('');
      return `
        <div class="proc-project-block">
          <div class="proc-proj-head" onclick="App.navigate('project','${p.id}')">
            <div class="proc-proj-name">${esc(p.name)}</div>
            <span class="status-pill ${p.status}">${p.status}</span>
            <div class="prog-bar" style="width:120px"><div class="prog-fill ${col}" style="width:${pct}%"></div></div>
            <span style="font-size:12px;color:var(--s500)">${done}/${steps.length}</span>
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" style="color:var(--s400)"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
          </div>
          <div class="proc-steps">${stepsHtml}</div>
        </div>`;
    }));
    const filtered=html.filter(Boolean);
    return `
      <div class="section-header mb-3">
        <div class="section-title"><span class="phase-pill ${col}">${phase}</span> 프로세스 현황</div>
        <button class="btn btn-primary btn-sm" onclick="App.showNewProjectModal()">+ 새 사업</button>
      </div>
      ${filtered.length===0?`<div class="empty-state"><div class="empty-icon">📂</div><h3>${phase} 단계 사업이 없습니다</h3></div>`
      :`<div style="display:flex;flex-direction:column;gap:16px">${filtered.join('')}</div>`}`;
  },

  renderStepCompact(s,i,projectId,phase){
    const dirClass=DIRECTION_CLASS[s.direction]||'dir-int';
    const dirLabel=DIRECTION_LABEL[s.direction]||'';
    return `
      <div class="proc-step ${s.done?'done':''}">
        <div class="proc-step-left">
          <button class="tl-check ${s.done?'checked':''}" onclick="App.toggleStep('${s.id}','${projectId}')"></button>
          <span class="proc-step-num">${String(i+1).padStart(2,'0')}</span>
          <span class="proc-step-name">${esc(s.name)}</span>
          <span class="tl-tag ${dirClass}" style="font-size:10px">${dirLabel}</span>
          ${s.is_conditional?`<span class="tl-tag cond" style="font-size:10px">조건부</span>`:''}
        </div>
        <div class="proc-step-right">
          ${s.approver?`<span style="font-size:11px;color:var(--blue);font-weight:600">결재: ${esc(s.approver)}</span>`:''}
          ${duePill(s)}
        </div>
      </div>`;
  },

  // ─── Project Detail ───
  async projectDetail(id){
    const p=await DB.getProject(id);
    if(!p)return'<div class="empty-state"><h3>사업을 찾을 수 없습니다</h3></div>';
    const steps=await DB.getSteps(id);
    const col=PHASE_COLORS[p.current_phase]||'blue';
    const done=steps.filter(s=>s.done).length;
    const total=steps.length;
    const pct=total>0?Math.round(done/total*100):0;

    const phaseProgress=['수주','발주','청구'].map((ph,i)=>{
      const phSteps=steps.filter(s=>s.phase===ph);
      const allDone=phSteps.length>0&&phSteps.every(s=>s.done);
      const isActive=ph===p.current_phase;
      const cls=allDone?'done':isActive?'active':'todo';
      const arrow=i<2?`<svg class="phase-arrow" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>`:'';
      return `<div class="phase-step"><div class="phase-step-inner ${cls}">
        <div class="phase-step-num">${allDone?'✓':i+1}</div>${ph}${phSteps.length>0?` (${phSteps.filter(s=>s.done).length}/${phSteps.length})`:''}
      </div></div>${arrow}`;
    }).join('');

    const phaseTabs=['수주','발주','청구'].map(ph=>{
      const phSteps=steps.filter(s=>s.phase===ph);
      const allDone=phSteps.length>0&&phSteps.every(s=>s.done);
      const c=PHASE_COLORS[ph];
      return `<button class="phase-tab ${p.current_phase===ph?`active ${c}`:''}" onclick="App.switchPhase('${id}','${ph}')">
        <span class="tab-dot"></span>${ph} ${allDone?'✓':`(${phSteps.filter(s=>s.done).length}/${phSteps.length})`}
      </button>`;
    }).join('');

    const phaseSteps=steps.filter(s=>s.phase===p.current_phase);
    const tlHtml=phaseSteps.length===0
      ?'<div class="empty-state"><div class="empty-icon">📝</div><h3>프로세스 단계가 없습니다</h3></div>'
      :phaseSteps.map((s,i)=>Pages.renderStep(s,i,id,p.current_phase)).join('');

    return `
      <div class="detail-layout">
        <div class="detail-hero">
          <div class="detail-hero-top">
            <div class="detail-hero-info">
              <button class="btn btn-ghost btn-sm mb-2" onclick="App.navigate('dashboard')">← 대시보드</button>
              <div class="detail-title">${esc(p.name)}</div>
              <div class="detail-meta">
                ${p.client?`<span class="detail-meta-item"><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2H4a1 1 0 110-2V4z" clip-rule="evenodd"/></svg>${esc(p.client)}</span>`:''}
                ${p.manager?`<span class="detail-meta-item"><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>${esc(p.manager)}</span>`:''}
                ${p.amount?`<span class="detail-meta-item">💰 ${fmtAmt(p.amount)}원</span>`:''}
                ${p.contract_date?`<span class="detail-meta-item">📅 ${p.contract_date} ~ ${p.deadline||'미정'}</span>`:''}
                ${p.amount>=200000000?`<span class="detail-meta-item" style="color:var(--red);font-weight:700">⚠️ 2억 이상 심의회 필요</span>`:''}
              </div>
            </div>
            <div class="detail-hero-actions">
              <span class="status-pill ${p.status}">${p.status}</span>
              <button class="btn btn-secondary btn-sm" onclick="App.showEditProject('${id}')">수정</button>
              <button class="btn btn-danger btn-sm" onclick="App.deleteProject('${id}')">삭제</button>
            </div>
          </div>
          <div class="detail-progress-bar"><div class="detail-progress-fill" style="width:${pct}%;background:${pct===100?'var(--green)':'linear-gradient(90deg,var(--blue),#818CF8)'}"></div></div>
        </div>
        <div class="phase-progress">${phaseProgress}</div>
        <div class="flex justify-between items-center">
          <div class="phase-tabs">${phaseTabs}</div>
          <button class="btn btn-secondary btn-sm" onclick="App.showAddStep('${id}','${p.current_phase}')">+ 단계 추가</button>
        </div>
        <div class="timeline">${tlHtml}</div>
      </div>`;
  },

  renderStep(s,i,projectId,phase){
    const dirClass=DIRECTION_CLASS[s.direction]||'dir-int';
    const dirLabel=DIRECTION_LABEL[s.direction]||'';
    return `
      <div class="timeline-item ${s.done?'done':''}">
        <div class="tl-icon-wrap ${s.done?'done':''} ${s.is_conditional?'conditional':''}">
          ${s.done?`<svg class="tl-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`
          :`<svg class="tl-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>`}
        </div>
        <div class="tl-card ${s.done?'done':''}" id="tl-${s.id}">
          <div class="tl-card-header" onclick="document.getElementById('tl-${s.id}').classList.toggle('expanded')">
            <span class="tl-step-num">${String(i+1).padStart(2,'0')}</span>
            <span class="tl-step-name">${esc(s.name)}</span>
            <div class="tl-tags">
              <span class="tl-tag ${dirClass}">${dirLabel}</span>
              ${s.is_conditional?`<span class="tl-tag cond">조건부</span>`:''}
            </div>
            ${duePill(s)}
            <button class="tl-check ${s.done?'checked':''}" onclick="event.stopPropagation();App.toggleStep('${s.id}','${projectId}')"></button>
            <svg class="tl-expand-btn" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          </div>
          <div class="tl-card-body">
            ${s.is_conditional?`<div class="cond-notice"><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>조건: ${esc(s.condition_desc)}</div>`:''}
            ${Approval.renderApprovalBox(s)}
            <div class="tl-body-fields">
              <div class="field-row">
                <span class="field-label">마감일</span>
                <input type="date" class="field-input" id="due-${s.id}" value="${s.due_date||''}">
                <button class="btn btn-secondary btn-sm" onclick="App.saveStepDue('${s.id}','${projectId}')">저장</button>
              </div>
              <div class="field-row">
                <span class="field-label">메모</span>
                <textarea class="field-textarea" id="note-${s.id}" placeholder="메모...">${esc(s.notes||'')}</textarea>
              </div>
            </div>
            <div class="tl-actions">
              <button class="btn btn-secondary btn-sm" onclick="App.saveStepNote('${s.id}','${projectId}')">메모 저장</button>
              <button class="btn btn-danger btn-sm" onclick="App.deleteStep('${s.id}','${projectId}')">삭제</button>
            </div>
          </div>
        </div>
      </div>`;
  },

  // ─── Calendar ───
  async calendar(){
    const now=new Date();
    return Pages._renderCalendar(now.getFullYear(),now.getMonth());
  },

  async _renderCalendar(year,month){
    const projects=await DB.getProjects();
    const events={};
    for(const p of projects){
      const steps=await DB.getSteps(p.id);
      steps.forEach(s=>{
        if(!s.due_date)return;
        if(!events[s.due_date])events[s.due_date]=[];
        const today=new Date();today.setHours(0,0,0,0);
        const due=new Date(s.due_date);
        let evtType=PHASE_COLORS[p.current_phase]||'blue';
        if(s.done)evtType='done';
        else if(due<today)evtType='red';
        events[s.due_date].push({name:s.name,project:p.name,type:evtType,pid:p.id,done:s.done});
      });
    }
    const mNames=['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
    const dNames=['일','월','화','수','목','금','토'];
    const first=new Date(year,month,1);
    const last=new Date(year,month+1,0);
    const today=new Date();today.setHours(0,0,0,0);
    let cells='';
    for(let i=0;i<first.getDay();i++){
      const d=new Date(year,month,-first.getDay()+i+1);
      cells+=`<div class="cal-cell other"><div class="cal-num">${d.getDate()}</div></div>`;
    }
    for(let d=1;d<=last.getDate();d++){
      const dt=new Date(year,month,d);dt.setHours(0,0,0,0);
      const key=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday=dt.getTime()===today.getTime();
      const dayEvts=events[key]||[];
      const evtHtml=dayEvts.slice(0,3).map(e=>`<div class="cal-evt ${e.type}" title="${esc(e.project+': '+e.name)}" onclick="App.navigate('project','${e.pid}')">${esc(e.name.slice(0,7))}</div>`).join('');
      const more=dayEvts.length>3?`<div style="font-size:9px;color:var(--s400)">+${dayEvts.length-3}</div>`:'';
      cells+=`<div class="cal-cell ${isToday?'today':''}"><div class="cal-num">${d}</div>${evtHtml}${more}</div>`;
    }
    const rem=(first.getDay()+last.getDate())%7;
    if(rem>0)for(let i=1;i<=7-rem;i++)cells+=`<div class="cal-cell other"><div class="cal-num">${i}</div></div>`;

    return `
      <div class="cal-legend mb-3 flex gap-3 flex-wrap">
        <span class="cal-legend-item"><span class="cal-evt-dot blue"></span>수주</span>
        <span class="cal-legend-item"><span class="cal-evt-dot green"></span>발주</span>
        <span class="cal-legend-item"><span class="cal-evt-dot amber"></span>청구</span>
        <span class="cal-legend-item"><span class="cal-evt-dot red"></span>기한초과</span>
        <span class="cal-legend-item"><span class="cal-evt-dot done"></span>완료</span>
      </div>
      <div class="cal-wrap">
        <div class="cal-head">
          <button class="btn btn-secondary btn-sm" onclick="Pages.calNav(${year},${month-1})">←</button>
          <h3>${year}년 ${mNames[month]}</h3>
          <button class="btn btn-secondary btn-sm" onclick="Pages.calNav(${year},${month+1})">→</button>
        </div>
        <div class="cal-grid">
          ${dNames.map(d=>`<div class="cal-dayname">${d}</div>`).join('')}
          ${cells}
        </div>
      </div>`;
  },

  // ─── Notifications ───
  async notifications(){
    const settings=DB.getSettings();
    const customNotifs=LS.get('bm_custom_notifs',[]).sort((a,b)=>new Date(a.scheduled_at)-new Date(b.scheduled_at));
    const deadlineAlerts=[];
    const projects=await DB.getProjects();
    for(const p of projects){
      const steps=await DB.getSteps(p.id);
      steps.forEach(s=>{
        if(s.done||!s.due_date)return;
        const diff=daysDiff(s.due_date);
        if(diff<0)deadlineAlerts.push({type:'danger',project:p.name,step:s.name,diff,pid:p.id});
        else if(diff<=(settings.notifyDays||3))deadlineAlerts.push({type:'warning',project:p.name,step:s.name,diff,pid:p.id});
      });
    }
    return `
      <div style="display:grid;grid-template-columns:1fr 340px;gap:24px;align-items:start">
        <div>
          <div class="section-header mb-3">
            <div class="section-title">📋 예약 알림</div>
          </div>
          <!-- Add form -->
          <div class="notif-add-card mb-4">
            <div class="section-title mb-3" style="font-size:14px">새 알림 등록</div>
            <div class="form-grid cols-2">
              <div class="form-field full"><label class="form-label">알림 제목 <span class="req">*</span></label>
                <input type="text" class="form-input" id="cn-title" placeholder="예) 납품서류 제출 마감"></div>
              <div class="form-field full"><label class="form-label">내용</label>
                <input type="text" class="form-input" id="cn-msg" placeholder="알림 내용 (선택)"></div>
              <div class="form-field full"><label class="form-label">날짜 · 시간 <span class="req">*</span></label>
                <input type="datetime-local" class="form-input" id="cn-datetime"></div>
            </div>
            <button class="btn btn-primary mt-2" onclick="App.addCustomNotif()">
              <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
              알림 등록
            </button>
          </div>

          <!-- Scheduled notifs list -->
          ${customNotifs.length===0?'<div class="empty-state" style="padding:30px 0"><div class="empty-icon">🔕</div><h3>예약된 알림이 없습니다</h3></div>'
          :customNotifs.map(n=>{
            const dt=new Date(n.scheduled_at);
            const past=dt<new Date();
            return `<div class="notif-item ${n.is_fired?'success':past?'danger':'info'}" style="margin-bottom:8px">
              <div class="notif-ico ${n.is_fired?'success':past?'danger':'info'}">
                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
              </div>
              <div style="flex:1">
                <div class="notif-title">${esc(n.title)}</div>
                ${n.message?`<div class="notif-desc">${esc(n.message)}</div>`:''}
                <div class="notif-desc">${dt.toLocaleString('ko-KR')} ${n.is_fired?'· 발송 완료':past?'· 발송 대기':'· 예약됨'}</div>
              </div>
              <button class="btn btn-danger btn-sm" onclick="App.deleteCustomNotif('${n.id}')">삭제</button>
            </div>`;
          }).join('')}

          <div class="divider mt-4"></div>
          <div class="section-title mb-3 mt-2">⏰ 마감 임박 알림 (${deadlineAlerts.length}건)</div>
          ${deadlineAlerts.length===0?'<div style="color:var(--s400);font-size:13px;padding:10px 0">마감 임박 항목이 없습니다.</div>'
          :deadlineAlerts.map(a=>`
            <div class="notif-item ${a.type}" style="cursor:pointer;margin-bottom:8px" onclick="App.navigate('project','${a.pid}')">
              <div class="notif-ico ${a.type}"><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg></div>
              <div><div class="notif-title">${esc(a.step)}</div><div class="notif-desc">${esc(a.project)} · ${a.diff<0?Math.abs(a.diff)+'일 초과':a.diff===0?'오늘 마감':'D-'+a.diff}</div></div>
            </div>`).join('')}
        </div>

        <div style="background:#fff;border-radius:var(--r-lg);border:1px solid var(--s200);padding:22px;box-shadow:var(--shadow-sm)">
          <div class="section-title mb-3">알림 설정</div>
          <div class="form-field mb-3"><label class="form-label"><input type="checkbox" id="st-enabled" ${settings.notifyEnabled?'checked':''} style="margin-right:6px">브라우저 알림 활성화</label></div>
          <div class="form-field mb-3"><label class="form-label">미리 알림 기간</label>
            <select class="form-select" id="st-days">${[1,2,3,5,7,14].map(d=>`<option value="${d}" ${settings.notifyDays===d?'selected':''}>${d}일 전부터</option>`).join('')}</select></div>
          <button class="btn btn-primary w-full" onclick="App.saveSettings()">저장</button>
          <div class="divider"></div>
          <button class="btn btn-secondary w-full" onclick="Notification.requestPermission().then(r=>Toast.show(r==='granted'?'알림 허용':'알림 차단',r==='granted'?'브라우저 알림이 활성화되었습니다.':'설정에서 허용해 주세요.',r==='granted'?'success':'warning'))">브라우저 알림 권한 요청</button>
        </div>
      </div>`;
  },

  // ─── Regulations ───
  async regulations(){
    const regs=await DB.getRegulations();
    const rules=await DB.getApprovalRules();
    return `
      <div class="tab-bar" id="reg-tabs">
        <button class="tab-btn active" data-rtab="reg" onclick="Pages.switchRegTab('reg',this)">사규 목록</button>
        <button class="tab-btn" data-rtab="rules" onclick="Pages.switchRegTab('rules',this)">결재 규정표</button>
      </div>
      <div id="rtab-reg">
        <div class="section-header mb-3">
          <div class="section-title">사규 / 규정 (${regs.length}건)</div>
          <button class="btn btn-primary btn-sm" onclick="App.showAddRegulation()">+ 사규 추가</button>
        </div>
        <p class="text-sm text-muted mb-3">사규를 등록하면 AI 챗봇이 참조하여 결재 절차 등을 안내합니다.</p>
        ${regs.length===0?`<div class="empty-state"><div class="empty-icon">📖</div><h3>등록된 사규가 없습니다</h3><p>사규를 추가하면 AI 챗봇이 참조합니다.</p></div>`
        :`<div style="display:flex;flex-direction:column;gap:8px">
          ${regs.map(r=>`
            <div class="regulation-card">
              <div class="reg-icon"><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg></div>
              <div class="reg-info">
                <div class="reg-name">${esc(r.title)} ${r.version?`<span style="font-size:11px;background:var(--s100);padding:1px 6px;border-radius:4px;color:var(--s500)">v${esc(r.version)}</span>`:''}</div>
                <div class="reg-desc">${esc((r.content||'').slice(0,120))}${(r.content||'').length>120?'…':''}</div>
              </div>
              <button class="btn btn-danger btn-sm" onclick="App.deleteRegulation('${r.id}')">삭제</button>
            </div>`).join('')}
        </div>`}
      </div>
      <div id="rtab-rules" style="display:none">
        <div class="section-header mb-3">
          <div class="section-title">결재 규정표</div>
          <button class="btn btn-primary btn-sm" onclick="App.showAddApprovalRule()">+ 규정 추가</button>
        </div>
        ${rules.length===0?`<div class="empty-state"><div class="empty-icon">⚖️</div><h3>등록된 결재 규정이 없습니다</h3><p>사규 입력 후 결재 규정을 추가하세요.</p></div>`
        :`<div style="display:flex;flex-direction:column;gap:8px">
          ${rules.map(r=>`
            <div class="approval-rule-card">
              <div style="flex:2"><div class="ar-doc-type">${esc(r.document_type)}</div><div style="font-size:11px;color:var(--s400)">${esc(r.description||'')}</div></div>
              <div style="flex:2;font-size:12px;color:var(--s500)">${fmtAmt(r.amount_min)||'0'}원 ~ ${r.amount_max?fmtAmt(r.amount_max)+'원':'무제한'}</div>
              <div class="ar-approver" style="flex:1">${esc(r.approver)}</div>
              <div style="flex:1;font-size:12px">${esc(r.approval_level||'-')}</div>
              <span class="ar-audit ${r.requires_audit?'yes':'no'}">${r.requires_audit?'감사 필요':'불필요'}</span>
              <button class="btn btn-danger btn-sm" onclick="App.deleteApprovalRule('${r.id}')">삭제</button>
            </div>`).join('')}
        </div>`}
      </div>`;
  },

  switchRegTab(tab,btn){
    document.querySelectorAll('#reg-tabs .tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('rtab-reg').style.display=tab==='reg'?'':'none';
    document.getElementById('rtab-rules').style.display=tab==='rules'?'':'none';
  },

  // ─── Feedback ───
  async feedback(){
    const items=LS.get('bm_feedback',[]);
    const priColors={low:'var(--s400)',normal:'var(--blue)',high:'var(--amber)',urgent:'var(--red)'};
    const priLabel={low:'낮음',normal:'보통',high:'높음',urgent:'긴급'};
    const stColors={pending:'var(--s500)',in_progress:'var(--blue)',done:'var(--green)',rejected:'var(--s300)'};
    const stLabel={pending:'대기',in_progress:'처리중',done:'완료',rejected:'반려'};
    return `
      <div style="display:grid;grid-template-columns:1fr 320px;gap:24px;align-items:start">
        <div>
          <div class="section-header mb-3">
            <div class="section-title">요청사항 목록 (${items.length}건)</div>
          </div>
          ${items.length===0?`<div class="empty-state"><div class="empty-icon">💬</div><h3>등록된 요청사항이 없습니다</h3><p>우측 폼에서 수정 요청사항을 등록해 주세요.</p></div>`
          :items.map(f=>`
            <div style="background:#fff;border:1px solid var(--s200);border-radius:var(--r-md);padding:16px 18px;margin-bottom:8px;box-shadow:var(--shadow-xs)">
              <div class="flex justify-between items-center mb-2">
                <div style="font-weight:700;font-size:14px">${esc(f.title)}</div>
                <div class="flex gap-2">
                  <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:${priColors[f.priority]}22;color:${priColors[f.priority]}">${priLabel[f.priority]||f.priority}</span>
                  <select style="font-size:11px;border:1px solid var(--s200);border-radius:4px;padding:2px 6px;font-family:inherit" onchange="App.updateFeedbackStatus('${f.id}',this.value)">
                    ${Object.entries(stLabel).map(([k,v])=>`<option value="${k}" ${f.status===k?'selected':''}>${v}</option>`).join('')}
                  </select>
                  <button class="btn btn-danger btn-xs" onclick="App.deleteFeedback('${f.id}')">삭제</button>
                </div>
              </div>
              ${f.description?`<div style="font-size:13px;color:var(--s600);margin-bottom:6px">${esc(f.description)}</div>`:''}
              <div style="font-size:11px;color:var(--s400)">${esc(f.category)} · ${new Date(f.created_at).toLocaleDateString('ko-KR')}</div>
            </div>`).join('')}
        </div>
        <div style="background:#fff;border-radius:var(--r-lg);border:1px solid var(--s200);padding:22px;box-shadow:var(--shadow-sm)">
          <div class="section-title mb-3">요청사항 등록</div>
          <div class="form-grid">
            <div class="form-field full"><label class="form-label">제목 <span class="req">*</span></label>
              <input type="text" class="form-input" id="fb-title" placeholder="예) 캘린더 주간보기 추가"></div>
            <div class="form-field full"><label class="form-label">상세 내용</label>
              <textarea class="form-textarea" id="fb-desc" placeholder="구체적인 요청 내용을 적어주세요..."></textarea></div>
            <div class="form-field"><label class="form-label">카테고리</label>
              <select class="form-select" id="fb-cat">
                <option>기능개선</option><option>버그수정</option><option>디자인</option><option>신기능</option><option>기타</option>
              </select></div>
            <div class="form-field"><label class="form-label">우선순위</label>
              <select class="form-select" id="fb-priority">
                <option value="low">낮음</option><option value="normal" selected>보통</option><option value="high">높음</option><option value="urgent">긴급</option>
              </select></div>
          </div>
          <button class="btn btn-primary w-full mt-2" onclick="App.addFeedback()">요청 등록</button>
        </div>
      </div>`;
  },
};

// ─── Calendar nav ───
Pages.calNav=function(year,month){
  if(month<0){year--;month=11;}if(month>11){year++;month=0;}
  Pages._renderCalendar(year,month).then(html=>{document.getElementById('page-content').innerHTML=html;});
};

// ─── Project card helper ───
function projCard(p){
  const col=PHASE_COLORS[p.current_phase]||'blue';
  return `<div class="proj-card ${col}" data-proj-id="${p.id}" data-proj-name="${esc(p.name)}">
    <div class="proj-card-top">
      <div><div class="proj-card-title">${esc(p.name)}</div><div class="proj-card-client">${esc(p.client||'고객사 미입력')}</div></div>
      <span class="status-pill ${p.status}">${p.status}</span>
    </div>
    <div class="proj-meta">
      <span>📅 ${p.deadline||'납기 미정'}</span>
      ${p.amount?`<span>💰 ${fmtAmt(p.amount)}원</span>`:''}
      <span class="phase-pill ${col}" style="margin-left:auto">${p.current_phase}</span>
    </div>
  </div>`;
}

// ─── Init ───
document.addEventListener('DOMContentLoaded',()=>App.init());
