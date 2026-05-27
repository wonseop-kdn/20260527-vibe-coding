// 알림 시스템
const Notif = {
  async requestPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const result = await Notification.requestPermission();
    return result === 'granted';
  },

  async send(title, body, icon) {
    const granted = await Notif.requestPermission();
    if (granted) {
      new Notification(title, { body, icon: icon || '/favicon.ico', tag: title });
    }
    Notif.showToast(title, body, 'info');
  },

  showToast(title, msg, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { info: '🔔', warning: '⚠️', danger: '🚨', success: '✅' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || '🔔'}</span>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${msg}</div>
      </div>
    `;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = 'all .3s'; setTimeout(() => toast.remove(), 300); }, 4000);
  },

  // 마감 임박 항목 체크
  checkDeadlines() {
    const settings = DB.settings.get();
    const notifyDays = settings.notifyDays || 3;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const projects = DB.projects.all();
    const alerts = [];

    projects.forEach(p => {
      if (p.status === '완료') return;
      (p.steps || []).forEach(step => {
        if (step.done || !step.dueDate) return;
        const due = new Date(step.dueDate); due.setHours(0, 0, 0, 0);
        const diff = Math.round((due - today) / 86400000);
        if (diff < 0) {
          alerts.push({ type: 'danger', project: p.name, step: step.name, diff, msg: `${Math.abs(diff)}일 초과` });
        } else if (diff <= notifyDays) {
          alerts.push({ type: 'warning', project: p.name, step: step.name, diff, msg: diff === 0 ? '오늘 마감' : `${diff}일 후 마감` });
        }
      });
    });

    // 알림 배너 표시
    const banner = document.getElementById('alert-banner');
    const badge = document.getElementById('notification-badge');
    const dot = document.getElementById('dot-badge');
    if (banner) {
      if (alerts.length > 0) {
        const overdue = alerts.filter(a => a.type === 'danger').length;
        const upcoming = alerts.filter(a => a.type === 'warning').length;
        let msg = '⚠️ ';
        if (overdue > 0) msg += `<strong>${overdue}건 기한 초과</strong> · `;
        if (upcoming > 0) msg += `<strong>${upcoming}건 마감 임박</strong> · `;
        msg += `<a href="#" onclick="App.navigate('notifications');return false;" style="color:#92400E;font-weight:700;">알림 목록 보기 →</a>`;
        banner.innerHTML = msg;
        banner.style.display = 'flex';
        if (badge) { badge.textContent = alerts.length; badge.style.display = ''; }
        if (dot) dot.style.display = '';
      } else {
        banner.style.display = 'none';
        if (badge) badge.style.display = 'none';
        if (dot) dot.style.display = 'none';
      }
    }

    return alerts;
  },

  // 브라우저 알림 (페이지 로드 시)
  async sendPendingNotifications() {
    const alerts = Notif.checkDeadlines();
    if (alerts.length === 0) return;
    const danger = alerts.filter(a => a.type === 'danger');
    const warning = alerts.filter(a => a.type === 'warning');
    if (danger.length > 0) {
      const a = danger[0];
      await Notif.send(`🚨 기한 초과: ${a.step}`, `[${a.project}] ${a.msg}`, '');
    } else if (warning.length > 0) {
      const a = warning[0];
      await Notif.send(`⚠️ 마감 임박: ${a.step}`, `[${a.project}] ${a.msg}`, '');
    }
  }
};
