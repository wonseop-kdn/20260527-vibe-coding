// LocalStorage 기반 데이터 관리
const DB = {
  get(key, def = null) {
    try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; }
  },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
  projects: {
    all() { return DB.get('bm_projects', []); },
    save(projects) { DB.set('bm_projects', projects); },
    get(id) { return DB.projects.all().find(p => p.id === id); },
    add(project) {
      const projects = DB.projects.all();
      projects.push(project);
      DB.projects.save(projects);
      return project;
    },
    update(id, data) {
      const projects = DB.projects.all().map(p => p.id === id ? { ...p, ...data } : p);
      DB.projects.save(projects);
    },
    delete(id) { DB.projects.save(DB.projects.all().filter(p => p.id !== id)); }
  },
  templates: {
    all() { return DB.get('bm_templates', DEFAULT_TEMPLATES); },
    save(templates) { DB.set('bm_templates', templates); },
    get(id) { return DB.templates.all().find(t => t.id === id); },
    add(template) {
      const templates = DB.templates.all();
      templates.push(template);
      DB.templates.save(templates);
    },
    update(id, data) {
      const templates = DB.templates.all().map(t => t.id === id ? { ...t, ...data } : t);
      DB.templates.save(templates);
    },
    delete(id) { DB.templates.save(DB.templates.all().filter(t => t.id !== id)); }
  },
  settings: {
    get() { return DB.get('bm_settings', { notifyDays: 3, notifyEnabled: true, notifySound: true }); },
    save(s) { DB.set('bm_settings', s); }
  },
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
};
