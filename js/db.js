// ── Database Layer (Supabase + localStorage fallback) ──────────
let _sb = null;
let _mode = 'local'; // 'supabase' | 'local'

async function initDB() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      // 실제 연결 테스트 — 테이블 없으면 여기서 에러
      const { error } = await _sb.from('projects').select('id').limit(1);
      if (error) throw error;
      _mode = 'supabase';
      const el = document.getElementById('db-status');
      if (el) { el.textContent = '● Supabase 연결됨'; el.className = 'db-badge db-supabase'; }
      console.log('[DB] Supabase 모드');
    } catch (e) {
      console.warn('[DB] Supabase 연결 실패 → localStorage 사용', e);
      _sb = null; _mode = 'local';
    }
  } else {
    console.log('[DB] localStorage 모드');
  }
}

// ── localStorage helpers ──
const LS = {
  get: (k, d = null) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

// ── Generic CRUD (both modes) ──
const DB = {
  mode() { return _mode; },

  // ── Projects ──
  async getProjects() {
    if (_mode === 'supabase') {
      const { data, error } = await _sb.from('projects').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
    return LS.get('bm_projects', []);
  },

  async getProject(id) {
    if (_mode === 'supabase') {
      const { data, error } = await _sb.from('projects').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    }
    return LS.get('bm_projects', []).find(p => p.id === id) || null;
  },

  async addProject(project) {
    if (_mode === 'supabase') {
      const { id, ...rest } = project; // Supabase auto-generates UUID
      const { data, error } = await _sb.from('projects').insert(rest).select().single();
      if (error) throw error;
      return data;
    }
    const projects = LS.get('bm_projects', []);
    projects.unshift(project);
    LS.set('bm_projects', projects);
    return project;
  },

  async updateProject(id, updates) {
    if (_mode === 'supabase') {
      const { data, error } = await _sb.from('projects').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const projects = LS.get('bm_projects', []).map(p => p.id === id ? { ...p, ...updates } : p);
    LS.set('bm_projects', projects);
    return projects.find(p => p.id === id);
  },

  async deleteProject(id) {
    if (_mode === 'supabase') {
      const { error } = await _sb.from('projects').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    LS.set('bm_projects', LS.get('bm_projects', []).filter(p => p.id !== id));
    // also delete steps in local mode
    LS.set('bm_steps', LS.get('bm_steps', []).filter(s => s.project_id !== id));
  },

  // ── Steps ──
  async getSteps(projectId) {
    if (_mode === 'supabase') {
      const { data, error } = await _sb.from('steps').select('*').eq('project_id', projectId).order('order_index');
      if (error) throw error;
      return data;
    }
    return LS.get('bm_steps', []).filter(s => s.project_id === projectId).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  },

  async addStep(step) {
    if (_mode === 'supabase') {
      const { id, ...rest } = step; // Supabase auto-generates UUID
      const { data, error } = await _sb.from('steps').insert(rest).select().single();
      if (error) throw error;
      return data;
    }
    const steps = LS.get('bm_steps', []);
    steps.push(step);
    LS.set('bm_steps', steps);
    return step;
  },

  async updateStep(id, updates) {
    if (_mode === 'supabase') {
      const { data, error } = await _sb.from('steps').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const steps = LS.get('bm_steps', []).map(s => s.id === id ? { ...s, ...updates } : s);
    LS.set('bm_steps', steps);
    return steps.find(s => s.id === id);
  },

  async deleteStep(id) {
    if (_mode === 'supabase') {
      const { error } = await _sb.from('steps').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    LS.set('bm_steps', LS.get('bm_steps', []).filter(s => s.id !== id));
  },

  // ── Regulations ──
  async getRegulations() {
    if (_mode === 'supabase') {
      const { data, error } = await _sb.from('regulations').select('*').order('created_at');
      if (error) throw error;
      return data;
    }
    return LS.get('bm_regulations', []);
  },

  async addRegulation(reg) {
    if (_mode === 'supabase') {
      const { id, ...rest } = reg;
      const { data, error } = await _sb.from('regulations').insert(rest).select().single();
      if (error) throw error;
      return data;
    }
    const regs = LS.get('bm_regulations', []);
    regs.push(reg);
    LS.set('bm_regulations', regs);
    return reg;
  },

  async deleteRegulation(id) {
    if (_mode === 'supabase') {
      const { error } = await _sb.from('regulations').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    LS.set('bm_regulations', LS.get('bm_regulations', []).filter(r => r.id !== id));
  },

  // ── Approval Rules ──
  async getApprovalRules() {
    if (_mode === 'supabase') {
      const { data, error } = await _sb.from('approval_rules').select('*').order('document_type');
      if (error) throw error;
      return data;
    }
    return LS.get('bm_approval_rules', []);
  },

  async addApprovalRule(rule) {
    if (_mode === 'supabase') {
      const { id, ...rest } = rule;
      const { data, error } = await _sb.from('approval_rules').insert(rest).select().single();
      if (error) throw error;
      return data;
    }
    const rules = LS.get('bm_approval_rules', []);
    rules.push(rule);
    LS.set('bm_approval_rules', rules);
    return rule;
  },

  async updateApprovalRule(id, updates) {
    if (_mode === 'supabase') {
      const { data, error } = await _sb.from('approval_rules').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const rules = LS.get('bm_approval_rules', []).map(r => r.id === id ? { ...r, ...updates } : r);
    LS.set('bm_approval_rules', rules);
    return rules.find(r => r.id === id);
  },

  async deleteApprovalRule(id) {
    if (_mode === 'supabase') {
      const { error } = await _sb.from('approval_rules').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    LS.set('bm_approval_rules', LS.get('bm_approval_rules', []).filter(r => r.id !== id));
  },

  // ── Templates ──
  async getTemplates() {
    if (_mode === 'supabase') {
      const { data, error } = await _sb.from('templates').select('*').order('created_at');
      if (error) throw error;
      return data && data.length > 0 ? data : DEFAULT_TEMPLATES_DATA;
    }
    const saved = LS.get('bm_templates', null);
    return saved || DEFAULT_TEMPLATES_DATA;
  },

  async saveTemplate(template) {
    if (_mode === 'supabase') {
      if (template.id && !template.id.startsWith('tpl_')) {
        const { data, error } = await _sb.from('templates').upsert(template).select().single();
        if (error) throw error;
        return data;
      }
      const { id, ...rest } = template;
      const { data, error } = await _sb.from('templates').insert(rest).select().single();
      if (error) throw error;
      return data;
    }
    const templates = LS.get('bm_templates', DEFAULT_TEMPLATES_DATA);
    const idx = templates.findIndex(t => t.id === template.id);
    if (idx >= 0) templates[idx] = template;
    else templates.push(template);
    LS.set('bm_templates', templates);
    return template;
  },

  // ── Settings ──
  getSettings() { return LS.get('bm_settings', { notifyDays: 3, notifyEnabled: true }); },
  saveSettings(s) { LS.set('bm_settings', s); },

  // ── Utils ──
  uid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  },

  // ── Export / Import ──
  async exportAll() {
    const [projects, regs, rules] = await Promise.all([
      DB.getProjects(), DB.getRegulations(), DB.getApprovalRules()
    ]);
    const allSteps = {};
    for (const p of projects) {
      allSteps[p.id] = await DB.getSteps(p.id);
    }
    return { projects, steps: allSteps, regulations: regs, approval_rules: rules, exportedAt: new Date().toISOString() };
  },

  async importAll(data) {
    if (data.projects) {
      LS.set('bm_projects', data.projects);
      const allSteps = [];
      for (const [pid, steps] of Object.entries(data.steps || {})) {
        allSteps.push(...steps);
      }
      LS.set('bm_steps', allSteps);
    }
    if (data.regulations) LS.set('bm_regulations', data.regulations);
    if (data.approval_rules) LS.set('bm_approval_rules', data.approval_rules);
  }
};
