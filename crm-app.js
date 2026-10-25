/**
 * ============================================================================
 * MY CRM STUDIO • SUITE OFICIAL DE GESTIÓN, ANALÍTICA Y MONETIZACIÓN (v11.0)
 * Client-Side Application Core Controller (assets/js/crm-app.js)
 * Partners Oficiales: Meta AI • TikTok for Developers • Google Cloud • Gemini • Groq
 * Dominios: https://cvstudio33.com.ar & https://protocololeviatham.github.io/codigos.net/
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  // ==========================================================================
  // 1. CONSTANTES Y CONFIGURACIÓN GENERAL (100% DATOS OFICIALES OAUTH 2.0)
  // ==========================================================================
  const WORKER_URL = 'https://paneldeestadisticas.lautybg2005.workers.dev';
  const STORAGE_KEY = 'mycrmstudio_space_v11';
  const THEME_KEY = 'mycrmstudio_theme_v11';
  const GUIDE_SEEN_KEY = 'mycrmstudio_guide_seen_v11';

  // ==========================================================================
  // 2. ESTADO GLOBAL REACTIVO DEL CRM
  // ==========================================================================
  let crmState = {
    workerUrl: WORKER_URL,
    accounts: [],
    activeAccountId: null,
    activeView: 'dashboard',
    catalogControls: {
      search: '',
      sortBy: 'date_desc',
      filterTier: 'all'
    },
    chartControls: {
      metricMode: 'dual', // 'dual' | 'breakdown' | 'er'
      chartType: 'area',  // 'area' | 'bar' | 'line'
      range: '15'         // '10' | '15' | 'all'
    },
    studioConfig: {
      nicheCpm: 24,       // CPM base en USD según nicho
      rightsMultiplier: 1 // 1.0 orgánico | 1.35 Spark Ads | 1.65 Exclusividad
    },
    calendarItems: [],
    savedScripts: [],
    utmLinks: [],
    auditChecklist: {},
    chatHistory: [],
    radarLastResult: null
  };

  let apexMainChart = null;
  let apexRadarChart = null;
  let activeGuideStep = 0;
  let confirmModalCallback = null;

  // ==========================================================================
  // 3. LOGOS OFICIALES Y NORMALIZACIÓN UNIVERSAL DE DATOS
  // ==========================================================================
  function getPlatformLogo(platform) {
    const p = String(platform || '').toLowerCase();
    if (p === 'tiktok') return 'tiktok.png';
    if (p === 'instagram' || p === 'meta') return 'instagram.png';
    if (p === 'youtube' || p === 'google') return 'youtube.png';
    return 'logo.png';
  }

  function getPlatformName(platform) {
    const p = String(platform || '').toLowerCase();
    if (p === 'tiktok') return 'TikTok Oficial';
    if (p === 'instagram') return 'Instagram Graph';
    if (p === 'youtube') return 'YouTube Data API';
    return 'Red Oficial';
  }

  function proxyThumbnailUrl(rawUrl) {
    if (!rawUrl || rawUrl === 'logo.png' || rawUrl.startsWith('data:')) return 'logo.png';
    if (rawUrl.includes('/api/proxy/image')) return rawUrl;
    return rawUrl;
  }

  function buildProxiedFallbackUrl(rawUrl) {
    if (!rawUrl || rawUrl === 'logo.png' || rawUrl.startsWith('data:')) return 'logo.png';
    if (rawUrl.includes('/api/proxy/image')) return 'logo.png';
    return `${crmState.workerUrl}/api/proxy/image?url=${encodeURIComponent(rawUrl)}`;
  }

  function normalizeVideo(v, platform, idx = 0) {
    if (!v || typeof v !== 'object') return null;
    const views = Math.max(0, Number(v.views ?? v.view_count ?? v.play_count ?? v.playCount ?? 0));
    const likes = Math.max(0, Number(v.likes ?? v.like_count ?? v.digg_count ?? v.diggCount ?? 0));
    const comments = Math.max(0, Number(v.comments ?? v.comment_count ?? v.commentCount ?? 0));
    const shares = Math.max(0, Number(v.shares ?? v.share_count ?? v.shareCount ?? 0));
    const totalInteractions = likes + comments + shares;

    let er = Number(v.er ?? v.engagement_rate ?? v.engagementRate ?? 0);
    if ((!er || isNaN(er)) && views > 0) {
      er = Number(((totalInteractions / views) * 100).toFixed(2));
    }

    let pubIso = v.publishedAt || v.published_at || v.create_time || v.createTime || v.timestamp || '';
    if (typeof pubIso === 'number') {
      pubIso = new Date(pubIso > 1e12 ? pubIso : pubIso * 1000).toISOString();
    } else if (!pubIso || isNaN(new Date(pubIso).getTime())) {
      pubIso = new Date(Date.now() - idx * 86400000).toISOString();
    }

    const rawThumb = v.thumbnail || v.cover || v.cover_image_url || v.origin_cover || 'logo.png';
    const id = String(v.id || v.video_id || `${platform || 'vid'}_${idx}_${Date.now()}`);
    const title = String(v.title || v.desc || v.video_description || v.caption || `Publicación #${idx + 1}`).trim();
    const url = v.url || v.share_url || v.permalink || (platform === 'youtube' ? `https://www.youtube.com/watch?v=${id}` : '#');

    return {
      id,
      platform: platform || v.platform || 'tiktok',
      title: title || `Publicación #${idx + 1}`,
      publishedAt: pubIso,
      views,
      likes,
      comments,
      shares,
      interactions: totalInteractions,
      er: Number(er.toFixed(2)),
      duration: Number(v.duration || 0),
      thumbnail: proxyThumbnailUrl(rawThumb),
      rawThumbnail: rawThumb,
      url
    };
  }

  function normalizeAccount(acc) {
    if (!acc || typeof acc !== 'object') return null;
    const platform = String(acc.platform || 'tiktok').toLowerCase();
    const rawVideos = Array.isArray(acc.videos) ? acc.videos : [];
    const videos = rawVideos.map((v, idx) => normalizeVideo(v, platform, idx)).filter(Boolean);

    videos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const sumVideoViews = videos.reduce((s, v) => s + v.views, 0);
    const sumInteractions = videos.reduce((s, v) => s + v.likes + v.comments + v.shares, 0);
    const followers = Math.max(0, Number(acc.followers || 0));
    const totalViews = Math.max(Number(acc.totalViews || 0), sumVideoViews);
    const mediaCount = Math.max(Number(acc.mediaCount || 0), videos.length);

    let er = Number(acc.engagementRate || 0);
    if (sumVideoViews > 0 && sumInteractions > 0) {
      er = Number(((sumInteractions / sumVideoViews) * 100).toFixed(2));
    } else if (!er && followers > 0 && videos.length > 0 && sumInteractions > 0) {
      er = Number((((sumInteractions / videos.length) / followers) * 100).toFixed(2));
    }

    return {
      id: acc.id || `acc_${platform}_${Date.now()}`,
      platform,
      name: acc.name || acc.handle || 'Cuenta Oficial',
      handle: acc.handle ? (acc.handle.startsWith('@') ? acc.handle : '@' + acc.handle) : '@cuenta',
      avatar: acc.avatar || getPlatformLogo(platform),
      bio: acc.bio || '',
      followers,
      following: Number(acc.following || 0),
      likes: Number(acc.likes || videos.reduce((s, v) => s + v.likes, 0)),
      totalViews,
      mediaCount,
      engagementRate: er,
      connectedAt: acc.connectedAt || new Date().toISOString(),
      lastSyncAt: acc.lastSyncAt || new Date().toISOString(),
      session: acc.session || '',
      source: 'oauth',
      videos
    };
  }

  function loadSpace() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const cleanAccounts = (Array.isArray(parsed.accounts) ? parsed.accounts : [])
          .filter(a => a && !a.isDemo && a.id !== 'acc_yt_cvstudio33' && a.id !== 'acc_ig_brand')
          .map(normalizeAccount)
          .filter(Boolean);

        crmState.accounts = cleanAccounts;
        crmState.activeAccountId = cleanAccounts.some(a => a.id === parsed.activeAccountId)
          ? parsed.activeAccountId
          : (cleanAccounts[0]?.id || null);

        if (Array.isArray(parsed.calendarItems)) crmState.calendarItems = parsed.calendarItems;
        if (Array.isArray(parsed.savedScripts)) crmState.savedScripts = parsed.savedScripts;
        if (Array.isArray(parsed.utmLinks)) crmState.utmLinks = parsed.utmLinks;
        if (parsed.auditChecklist && typeof parsed.auditChecklist === 'object') crmState.auditChecklist = parsed.auditChecklist;
        if (Array.isArray(parsed.chatHistory)) crmState.chatHistory = parsed.chatHistory.slice(-16);
        if (parsed.studioConfig && typeof parsed.studioConfig === 'object') {
          crmState.studioConfig = { ...crmState.studioConfig, ...parsed.studioConfig };
        }
      }
    } catch (e) {
      console.warn('[My CRM Studio] Error cargando espacio local:', e);
    }

    // Semilla inicial de Calendario y Guiones solo si están vacíos para mostrar ejemplos reales editables
    if (crmState.calendarItems.length === 0) {
      crmState.calendarItems = [
        {
          id: 'cal_init_1',
          title: 'Caso de Éxito: Estructura de Video de Alta Retención (0-3s Hook)',
          platform: 'tiktok',
          date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          status: 'ready',
          hook: 'Si tus videos se estancan en 200 vistas, cambia esta estructura en los primeros 3 segundos...'
        },
        {
          id: 'cal_init_2',
          title: 'Demostración Práctica detrás de escena + CTA a Link en Bio',
          platform: 'instagram',
          date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
          status: 'scripting',
          hook: '3 ajustes que aplicamos hoy para duplicar la retención orgánica...'
        }
      ];
    }

    if (crmState.savedScripts.length === 0) {
      crmState.savedScripts = [
        {
          id: 'scr_init_1',
          title: 'Fórmula Gancho Negativo + Prueba Visual + CTA de Palabra Clave',
          platform: 'tiktok',
          hook: 'Deja de cometer este error en los primeros 3 segundos si quieres escalar tu alcance orgánico.',
          body: '1. Muestra el resultado final en el segundo 1.\n2. Explica los 2 pasos concretos sin introducción larga.\n3. Usa cambio de plano cada 4 segundos.',
          cta: 'Comenta la palabra "PLANTILLA" y entra al enlace de mi perfil para descargarla.',
          createdAt: new Date().toISOString()
        }
      ];
    }
  }

  function saveSpace() {
    try {
      const payload = {
        accounts: crmState.accounts,
        activeAccountId: crmState.activeAccountId,
        calendarItems: crmState.calendarItems,
        savedScripts: crmState.savedScripts,
        utmLinks: crmState.utmLinks,
        auditChecklist: crmState.auditChecklist,
        chatHistory: crmState.chatHistory.slice(-16),
        studioConfig: crmState.studioConfig
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[My CRM Studio] Error guardando estado:', e);
    }
  }

  function getActiveAccount() {
    if (!crmState.accounts.length) return null;
    return crmState.accounts.find(a => a.id === crmState.activeAccountId) || crmState.accounts[0];
  }

  function selectActiveAccount(accountId) {
    crmState.activeAccountId = accountId;
    saveSpace();
    toggleAccountMenu(false);
    renderApp();
    const current = getActiveAccount();
    if (current) {
      showToast({
        type: 'info',
        title: 'Cuenta Oficial Activa',
        message: `Visualizando métricas verificadas de ${current.name} (${current.handle}).`,
        iconImg: getPlatformLogo(current.platform)
      });
    }
  }

  function removeAccount(accountId, event) {
    if (event) event.stopPropagation();
    const target = crmState.accounts.find(a => a.id === accountId);
    if (!target) return;

    showConfirmModal({
      title: 'Desvincular cuenta oficial',
      message: `¿Deseas desvincular ${target.name} (${target.handle}) de My CRM Studio? Puedes reconectarla por OAuth 2.0 cuando quieras.`,
      confirmText: 'Sí, desvincular',
      cancelText: 'Cancelar',
      danger: true,
      onConfirm: () => {
        crmState.accounts = crmState.accounts.filter(a => a.id !== accountId);
        crmState.activeAccountId = crmState.accounts[0]?.id || null;
        saveSpace();
        toggleAccountMenu(false);
        renderApp();
        showToast({
          type: 'info',
          title: 'Cuenta Desvinculada',
          message: `Se eliminó ${target.handle} de tu sesión local.`
        });
      }
    });
  }

  // ==========================================================================
  // 4. TEMA VISUAL Y NAVEGACIÓN NATIVA (DESKTOP + MOBILE DOCK)
  // ==========================================================================
  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    const root = document.documentElement;
    if (savedTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    updateThemeUI();
  }

  function toggleTheme() {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    if (isDark) {
      root.classList.remove('dark');
      root.classList.add('light');
      localStorage.setItem(THEME_KEY, 'light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    }
    updateThemeUI();
    renderMainChart();
  }

  function updateThemeUI() {
    const isDark = document.documentElement.classList.contains('dark');
    const label = document.getElementById('themeModeLabel');
    if (label) label.textContent = isDark ? 'Modo Claro' : 'Modo Oscuro';
  }

  function toggleAccountMenu(force) {
    const menu = document.getElementById('accountDropdownMenu');
    if (!menu) return;
    const isHidden = menu.classList.contains('hidden');
    const show = typeof force === 'boolean' ? force : isHidden;
    if (show) menu.classList.remove('hidden');
    else menu.classList.add('hidden');
  }

  function switchView(viewName) {
    crmState.activeView = viewName;

    document.querySelectorAll('.crm-view-section').forEach(sec => {
      sec.classList.add('hidden');
    });

    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.remove('hidden');

    // Actualizar botones del Sidebar de Escritorio
    document.querySelectorAll('.nav-btn').forEach(btn => {
      const v = btn.getAttribute('data-view');
      if (v === viewName) {
        btn.classList.add('bg-indigo-600/12', 'text-indigo-600', 'dark:text-indigo-400', 'font-bold', 'border-indigo-500/30');
        btn.classList.remove('text-slate-600', 'dark:text-slate-400', 'border-transparent');
      } else {
        btn.classList.remove('bg-indigo-600/12', 'text-indigo-600', 'dark:text-indigo-400', 'font-bold', 'border-indigo-500/30');
        btn.classList.add('text-slate-600', 'dark:text-slate-400', 'border-transparent');
      }
    });

    // Actualizar barra de navegación inferior nativa de Celulares
    document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
      const v = btn.getAttribute('data-mobile-tab');
      if (v === viewName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (viewName === 'dashboard') {
      setTimeout(() => renderMainChart(), 60);
    } else if (viewName === 'content-engine') {
      renderCatalogView();
    } else if (viewName === 'crm-calendar') {
      renderCrmCalendar();
    } else if (viewName === 'crm-studio') {
      renderCrmStudio();
    } else if (viewName === 'ai-audit') {
      renderAuditSection();
    }

    toggleMobileSidebar(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==========================================================================
  // 5. SISTEMA DE MODALES Y NOTIFICACIONES PERSONALIZADAS (CON LOGO.PNG)
  // ==========================================================================
  function showConfirmModal({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false, onConfirm }) {
    const modal = document.getElementById('customConfirmModal');
    if (!modal) {
      if (typeof onConfirm === 'function') onConfirm();
      return;
    }
    const titleEl = document.getElementById('confirmModalTitle');
    const msgEl = document.getElementById('confirmModalMessage');
    const confirmBtn = document.getElementById('confirmModalActionBtn');
    const cancelBtn = document.getElementById('confirmModalCancelBtn');

    if (titleEl) titleEl.textContent = title || 'Confirmación';
    if (msgEl) msgEl.textContent = message || '';
    if (confirmBtn) {
      confirmBtn.textContent = confirmText;
      confirmBtn.className = danger
        ? 'flex-1 py-2.5 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-xs'
        : 'flex-1 py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs';
    }
    if (cancelBtn) cancelBtn.textContent = cancelText;

    confirmModalCallback = onConfirm;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function executeConfirmModalAction() {
    const modal = document.getElementById('customConfirmModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    if (typeof confirmModalCallback === 'function') {
      const cb = confirmModalCallback;
      confirmModalCallback = null;
      cb();
    }
  }

  function closeConfirmModal() {
    const modal = document.getElementById('customConfirmModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    confirmModalCallback = null;
  }

  function showToast({ type = 'info', title = '', message = '', duration = 4500, iconImg = 'logo.png' }) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const colorMap = {
      success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
      error: 'border-red-500/40 bg-red-500/10 text-red-400',
      warning: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
      info: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400'
    };

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-300 translate-y-2 opacity-0 surface-card';
    toast.style.borderColor = 'var(--border-subtle)';

    toast.innerHTML = `
      <div class="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 p-1.5 ${colorMap[type] || colorMap.info}">
        <img src="${escapeHtml(iconImg)}" alt="My CRM Studio" class="w-full h-full object-contain" onerror="this.src='logo.png'" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-xs font-extrabold text-slate-900 dark:text-slate-100">${escapeHtml(title)}</div>
        <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">${escapeHtml(message)}</div>
      </div>
      <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold px-1">✕</button>
    `;

    const closeBtn = toast.querySelector('button');
    const removeToast = () => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 260);
    };
    if (closeBtn) closeBtn.onclick = removeToast;

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(removeToast, duration);
  }

  // ==========================================================================
  // 6. RENDERIZADO GENERAL Y TARJETA DE BIENVENIDA OFICIAL OAUTH 2.0
  // ==========================================================================
  function renderApp() {
    renderAccountSwitcher();
    renderOverviewMetrics();
    renderMainChart();
    renderRecentPublicationsGallery();
    renderCatalogView();
    renderCrmCalendar();
    renderCrmStudio();
    renderAuditSection();
    renderAiContextInfo();
  }

  function renderAccountSwitcher() {
    const current = getActiveAccount();
    const avatarEl = document.getElementById('activeAccountAvatar');
    const nameEl = document.getElementById('activeAccountName');
    const handleEl = document.getElementById('activeAccountHandle');
    const badgeEl = document.getElementById('activePlatformBadge');
    const listEl = document.getElementById('accountSwitcherList');
    const countBadge = document.getElementById('connectedAccountsCount');

    if (countBadge) countBadge.textContent = String(crmState.accounts.length);

    if (!current) {
      if (avatarEl) avatarEl.src = 'logo.png';
      if (nameEl) nameEl.textContent = 'Sin cuenta conectada';
      if (handleEl) handleEl.textContent = 'Conecta vía OAuth 2.0 Oficial';
      if (badgeEl) {
        badgeEl.className = 'px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-500/10 text-slate-500';
        badgeEl.textContent = 'OFFLINE';
      }
    } else {
      if (avatarEl) {
        avatarEl.src = current.avatar || getPlatformLogo(current.platform);
        avatarEl.onerror = () => { avatarEl.src = getPlatformLogo(current.platform); };
      }
      if (nameEl) nameEl.textContent = current.name;
      if (handleEl) handleEl.textContent = `${current.handle} • ${formatCompactNumber(current.followers)} seg.`;

      if (badgeEl) {
        badgeEl.className = 'px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-indigo-500/15 text-indigo-500 flex items-center gap-1';
        badgeEl.innerHTML = `<img src="${getPlatformLogo(current.platform)}" class="w-3.5 h-3.5 object-contain" alt="" /><span>${current.platform.toUpperCase()} OAUTH</span>`;
      }
    }

    if (listEl) {
      if (crmState.accounts.length === 0) {
        listEl.innerHTML = `
          <div class="p-4 text-center text-xs text-slate-400">
            Aún no hay cuentas conectadas. Usa los botones oficiales de <strong>Meta</strong>, <strong>TikTok</strong> o <strong>Google</strong> abajo.
          </div>
        `;
      } else {
        listEl.innerHTML = crmState.accounts.map(acc => {
          const isCurrent = current && acc.id === current.id;
          const pLogo = getPlatformLogo(acc.platform);
          return `
            <div onclick="selectActiveAccount('${acc.id}')" class="flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition ${isCurrent ? 'bg-indigo-600/12 border border-indigo-500/30' : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'}">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="relative shrink-0">
                  <img src="${escapeHtml(acc.avatar || pLogo)}" referrerpolicy="no-referrer" onerror="this.src='${pLogo}'" class="w-9 h-9 rounded-full object-cover border border-slate-300 dark:border-slate-700" />
                  <img src="${pLogo}" class="w-4 h-4 rounded-full object-contain bg-white dark:bg-slate-900 p-0.5 absolute -bottom-0.5 -right-0.5 shadow" alt="" />
                </div>
                <div class="min-w-0">
                  <div class="text-xs font-bold truncate ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : ''}">${escapeHtml(acc.name)}</div>
                  <div class="text-[10px] text-slate-400 truncate">${escapeHtml(acc.handle)} • ${formatCompactNumber(acc.followers)} seg • ${(acc.videos || []).length} videos</div>
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                ${isCurrent ? '<span class="w-2 h-2 rounded-full bg-emerald-500"></span>' : ''}
                <button onclick="removeAccount('${acc.id}', event)" title="Desvincular cuenta" class="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition text-xs">
                  ✕
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  function renderOverviewMetrics() {
    const current = getActiveAccount();
    const emptyStateBanner = document.getElementById('emptyAccountsOnboarding');
    const mainMetricsWrapper = document.getElementById('dashboardMainContent');

    if (!current) {
      if (emptyStateBanner) emptyStateBanner.classList.remove('hidden');
      if (mainMetricsWrapper) mainMetricsWrapper.classList.add('hidden');
      return;
    }

    if (emptyStateBanner) emptyStateBanner.classList.add('hidden');
    if (mainMetricsWrapper) mainMetricsWrapper.classList.remove('hidden');

    const followersEl = document.getElementById('statFollowers');
    const viewsEl = document.getElementById('statViews');
    const erEl = document.getElementById('statEngagement');
    const countEl = document.getElementById('statContentCount');

    const followersSub = document.getElementById('statFollowersSub');
    const viewsSub = document.getElementById('statViewsSub');
    const erSub = document.getElementById('statEngagementSub');
    const countSub = document.getElementById('statContentSub');

    const vids = current.videos || [];
    const totalLikes = vids.reduce((s, v) => s + (v.likes || 0), 0) || Number(current.likes || 0);
    const totalComments = vids.reduce((s, v) => s + (v.comments || 0), 0);
    const avgViews = vids.length > 0 ? Math.round(vids.reduce((s, v) => s + (v.views || 0), 0) / vids.length) : 0;

    if (followersEl) followersEl.textContent = formatNumber(current.followers);
    if (viewsEl) viewsEl.textContent = formatNumber(current.totalViews);
    if (erEl) erEl.textContent = `${current.engagementRate}%`;
    if (countEl) countEl.textContent = formatNumber(current.mediaCount || vids.length);

    if (followersSub) followersSub.textContent = `${current.handle} • Verificado por OAuth 2.0`;
    if (viewsSub) viewsSub.textContent = `Promedio: ${formatCompactNumber(avgViews)} vistas / video`;
    if (erSub) erSub.textContent = `${formatCompactNumber(totalLikes)} likes • ${formatCompactNumber(totalComments)} coments`;
    if (countSub) countSub.textContent = `${vids.length} publicaciones sincronizadas en galería`;

    const activeBar = document.getElementById('liveAccountHeaderBar');
    if (activeBar) {
      const pLogo = getPlatformLogo(current.platform);
      activeBar.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3.5 min-w-0">
            <div class="relative shrink-0">
              <img src="${escapeHtml(current.avatar || pLogo)}" referrerpolicy="no-referrer" onerror="this.src='${pLogo}'" class="w-13 h-13 rounded-2xl object-cover border-2 border-indigo-500/30 shadow-md" />
              <img src="${pLogo}" class="w-5 h-5 rounded-full bg-white dark:bg-slate-900 p-0.5 absolute -bottom-1 -right-1 shadow" alt="" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-base sm:text-lg font-extrabold tracking-tight truncate">${escapeHtml(current.name)}</h2>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-500 flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> OAUTH 2.0 OFICIAL
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                ${escapeHtml(current.handle)} ${current.bio ? '• ' + escapeHtml(current.bio) : ''}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button onclick="syncLiveAccountVideos(false)" class="sync-live-btn flex items-center gap-2 px-4 py-2.5 rounded-2xl border surface-card hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-extrabold transition shadow-2xs" style="border-color: var(--border-subtle);">
              <img src="logo.png" class="w-4 h-4 object-contain sync-icon" alt="" />
              <span>Sincronizar API Oficial</span>
            </button>
            <button onclick="openAiDrawer()" class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition shadow-xs">
              <img src="logonyx.png" class="w-4 h-4 object-contain" alt="NYX" />
              <span>Auditar con NYX</span>
            </button>
          </div>
        </div>
      `;
    }
  }

  // ==========================================================================
  // 7. GALERÍA VISUAL DE PUBLICACIONES REALES (CERO TABLAS BÁSICAS)
  // ==========================================================================
  function handleImageFallback(imgEl, rawUrl) {
    if (!imgEl) return;
    const triedProxy = imgEl.getAttribute('data-tried-proxy');
    if (!triedProxy && rawUrl && rawUrl !== 'logo.png' && !rawUrl.includes('/api/proxy/image')) {
      imgEl.setAttribute('data-tried-proxy', '1');
      imgEl.src = buildProxiedFallbackUrl(rawUrl);
      return;
    }
    imgEl.onerror = null;
    imgEl.src = 'logo.png';
  }

  function buildVideoGalleryCard(v, platform, avgViews) {
    const pLogo = getPlatformLogo(platform);
    const isTop = avgViews > 0 && v.views >= avgViews * 1.3;
    const isHighEr = v.er >= 6;

    const badgeHtml = isTop
      ? `<span class="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-emerald-500/90 text-white backdrop-blur-md flex items-center gap-1 shadow-sm"><img src="logo.png" class="w-3 h-3 object-contain" alt="" /> Destacado Viral</span>`
      : (isHighEr
          ? `<span class="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-indigo-600/90 text-white backdrop-blur-md flex items-center gap-1 shadow-sm"><img src="logo.png" class="w-3 h-3 object-contain" alt="" /> Alto ER%</span>`
          : `<span class="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-900/75 text-slate-200 backdrop-blur-md">Verificado</span>`);

    const erBarWidth = Math.min(100, Math.max(8, Math.round(v.er * 8)));

    return `
      <article class="group rounded-3xl border surface-card overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-indigo-500/40" style="border-color: var(--border-subtle);">
        <div>
          <!-- Portada Visual 16:9 con Proxy Anti-CORS y Badges Oficiales -->
          <div class="relative aspect-video bg-slate-900 overflow-hidden">
            <img
              src="${escapeHtml(v.thumbnail)}"
              referrerpolicy="no-referrer"
              onerror="handleImageFallback(this, '${escapeHtml(v.rawThumbnail || '')}')"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              alt="${escapeHtml(v.title)}"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent"></div>

            <div class="absolute top-3 left-3 flex items-center gap-1.5">
              <div class="w-7 h-7 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/15 flex items-center justify-center p-1 shadow">
                <img src="${pLogo}" class="w-full h-full object-contain" alt="${platform}" />
              </div>
              ${badgeHtml}
            </div>

            <div class="absolute top-3 right-3">
              <span class="px-2.5 py-1 rounded-xl text-[10px] font-mono font-extrabold bg-slate-950/80 text-white backdrop-blur-md border border-white/10">
                ER ${v.er}%
              </span>
            </div>

            <div class="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white/90 font-medium">
              <span class="font-mono text-[10px] bg-black/50 px-2 py-0.5 rounded-lg backdrop-blur-xs">${formatFriendlyDate(v.publishedAt)}</span>
              ${v.duration > 0 ? `<span class="font-mono text-[10px] bg-black/60 px-2 py-0.5 rounded-lg">${formatDuration(v.duration)}</span>` : ''}
            </div>
          </div>

          <!-- Título de la Publicación -->
          <div class="p-4 pb-3">
            <a href="${escapeHtml(v.url)}" target="_blank" rel="noopener noreferrer" class="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 hover:text-indigo-500 dark:hover:text-indigo-400 line-clamp-2 leading-snug transition">
              ${escapeHtml(v.title)}
            </a>
          </div>
        </div>

        <!-- Telemetría de 4 Métricas + Barra de Interacción + Acción NYX -->
        <div class="px-4 pb-4 space-y-3">
          <div class="grid grid-cols-4 gap-1.5 p-2.5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border text-center" style="border-color: var(--border-subtle);">
            <div>
              <div class="text-[9px] font-bold uppercase text-slate-400">Vistas</div>
              <div class="text-xs font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">${formatCompactNumber(v.views)}</div>
            </div>
            <div>
              <div class="text-[9px] font-bold uppercase text-slate-400">Likes</div>
              <div class="text-xs font-extrabold font-mono text-pink-500 mt-0.5">${formatCompactNumber(v.likes)}</div>
            </div>
            <div>
              <div class="text-[9px] font-bold uppercase text-slate-400">Coments</div>
              <div class="text-xs font-extrabold font-mono text-sky-500 mt-0.5">${formatCompactNumber(v.comments)}</div>
            </div>
            <div>
              <div class="text-[9px] font-bold uppercase text-slate-400">Shares</div>
              <div class="text-xs font-extrabold font-mono text-emerald-500 mt-0.5">${formatCompactNumber(v.shares)}</div>
            </div>
          </div>

          <!-- Barra de Retención e Interacción -->
          <div class="space-y-1">
            <div class="flex items-center justify-between text-[10px]">
              <span class="font-bold text-slate-400">Índice de Interacción</span>
              <span class="font-mono font-extrabold text-indigo-500">${v.er}% ER</span>
            </div>
            <div class="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div class="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400" style="width: ${erBarWidth}%"></div>
            </div>
          </div>

          <!-- Botones de Acción -->
          <div class="flex items-center justify-between gap-2 pt-1">
            <a href="${escapeHtml(v.url)}" target="_blank" rel="noopener noreferrer" class="flex-1 py-2 px-3 rounded-xl border text-center text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition" style="border-color: var(--border-subtle);">
              Abrir publicación ↗
            </a>
            <button onclick="analyzeVideoWithNyx('${escapeHtml(v.id)}')" class="flex-1 py-2 px-3 rounded-xl bg-indigo-500/12 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white text-[11px] font-extrabold transition flex items-center justify-center gap-1.5">
              <img src="logonyx.png" class="w-3.5 h-3.5 object-contain" alt="" />
              <span>Analizar IA</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function renderRecentPublicationsGallery() {
    const galleryEl = document.getElementById('recentPublicationsGallery');
    const emptyEl = document.getElementById('contentEmptyNotice');
    if (!galleryEl) return;

    const current = getActiveAccount();
    if (!current || !Array.isArray(current.videos) || current.videos.length === 0) {
      galleryEl.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');
    const videos = current.videos.slice(0, 9);
    const avgViews = current.videos.reduce((s, v) => s + v.views, 0) / current.videos.length;

    galleryEl.innerHTML = videos.map(v => buildVideoGalleryCard(v, current.platform, avgViews)).join('');
  }

  function renderCatalogView() {
    const current = getActiveAccount();
    const gridContainer = document.getElementById('contentGridContainerFull');
    const totalBadge = document.getElementById('catalogTotalBadge');

    if (!gridContainer) return;

    if (!current || !Array.isArray(current.videos) || current.videos.length === 0) {
      if (totalBadge) totalBadge.textContent = '0 publicaciones';
      gridContainer.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-400 text-xs">
          Conecta tu cuenta oficial mediante OAuth 2.0 (Meta, TikTok o Google) o presiona <strong>Sincronizar API Oficial</strong> para cargar la galería completa.
        </div>
      `;
      return;
    }

    const { search, sortBy, filterTier } = crmState.catalogControls;
    const avgViews = current.videos.reduce((s, v) => s + v.views, 0) / (current.videos.length || 1);

    let filtered = current.videos.filter(v => {
      if (search && !v.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterTier === 'viral' && v.views < avgViews * 1.2) return false;
      if (filterTier === 'high_er' && v.er < 5) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'views_desc') return b.views - a.views;
      if (sortBy === 'er_desc') return b.er - a.er;
      if (sortBy === 'likes_desc') return b.likes - a.likes;
      if (sortBy === 'comments_desc') return b.comments - a.comments;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    if (totalBadge) totalBadge.textContent = `${filtered.length} de ${current.videos.length} publicaciones en galería`;

    if (filtered.length === 0) {
      gridContainer.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-400 text-xs">
          No se encontraron publicaciones que coincidan con tu búsqueda o filtro actual.
        </div>
      `;
      return;
    }

    gridContainer.innerHTML = filtered.map(v => buildVideoGalleryCard(v, current.platform, avgViews)).join('');
  }

  function updateCatalogFilter(field, value) {
    crmState.catalogControls[field] = value;
    renderCatalogView();
  }

  function analyzeVideoWithNyx(videoId) {
    const current = getActiveAccount();
    if (!current) return;
    const v = (current.videos || []).find(item => String(item.id) === String(videoId));
    if (!v) return;

    openAiDrawer();
    const input = document.getElementById('aiChatInput');
    const prompt = `Audita en profundidad mi publicación "${v.title}" (${formatNumber(v.views)} vistas, ${formatNumber(v.likes)} likes, ${formatNumber(v.comments)} comentarios, ER ${v.er}%). ¿Por qué tuvo este rendimiento y cómo creo una secuela que supere sus métricas?`;
    if (input) {
      input.value = prompt;
      handleAiSubmit();
    }
  }

  function exportCatalogCSV() {
    const current = getActiveAccount();
    if (!current || !current.videos || !current.videos.length) {
      showToast({
        type: 'warning',
        title: 'Sin datos para exportar',
        message: 'Primero conecta y sincroniza una cuenta oficial con publicaciones.'
      });
      return;
    }

    const headers = ['ID', 'Plataforma', 'Titulo', 'Fecha', 'Vistas', 'Likes', 'Comentarios', 'Compartidos', 'ER%', 'URL'];
    const rows = current.videos.map(v => [
      `"${String(v.id).replace(/"/g, '""')}"`,
      `"${v.platform}"`,
      `"${String(v.title).replace(/"/g, '""')}"`,
      `"${v.publishedAt}"`,
      v.views,
      v.likes,
      v.comments,
      v.shares,
      v.er,
      `"${v.url}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MyCRMStudio_${current.handle.replace('@', '')}_galeria.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      type: 'success',
      title: 'Galería Exportada (CSV)',
      message: `Se descargaron ${current.videos.length} publicaciones verificadas de ${current.handle}.`
    });
  }

  // ==========================================================================
  // 8. GRÁFICA PROFESIONAL DE EVOLUCIÓN DE VISUALIZACIONES E INTERACCIONES
  // ==========================================================================
  function setChartMetricMode(mode) {
    crmState.chartControls.metricMode = mode;
    document.querySelectorAll('[data-chart-mode]').forEach(btn => {
      const m = btn.getAttribute('data-chart-mode');
      if (m === mode) {
        btn.className = 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-indigo-600 text-white transition shadow-xs';
      } else {
        btn.className = 'px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition';
      }
    });
    renderMainChart();
  }

  function setChartType(type) {
    crmState.chartControls.chartType = type;
    document.querySelectorAll('[data-chart-type]').forEach(btn => {
      const t = btn.getAttribute('data-chart-type');
      if (t === type) {
        btn.className = 'px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 transition';
      } else {
        btn.className = 'px-2.5 py-1 rounded-lg text-[10.5px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition';
      }
    });
    renderMainChart();
  }

  function setChartRange(range) {
    crmState.chartControls.range = range;
    renderMainChart();
  }

  function renderMainChart() {
    const chartContainer = document.getElementById('mainPerformanceChart');
    if (!chartContainer || typeof window.ApexCharts === 'undefined') return;

    const current = getActiveAccount();
    const isDark = document.documentElement.classList.contains('dark');

    if (apexMainChart) {
      try { apexMainChart.destroy(); } catch (e) {}
      apexMainChart = null;
    }

    if (!current || !Array.isArray(current.videos) || current.videos.length === 0) {
      chartContainer.innerHTML = `
        <div class="h-72 flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
          <img src="logo.png" class="w-10 h-10 object-contain mb-3 opacity-60" alt="" />
          <p class="font-bold text-slate-600 dark:text-slate-300">Gráfica de Evolución en Espera de Publicaciones</p>
          <p class="mt-1 max-w-md">Conecta tu cuenta oficial o presiona <strong>Sincronizar API Oficial</strong> para trazar la curva cronológica de visualizaciones, likes, comentarios y ER%.</p>
        </div>
      `;
      return;
    }

    chartContainer.innerHTML = '';

    const { metricMode, chartType, range } = crmState.chartControls;
    const limit = range === 'all' ? current.videos.length : parseInt(range, 10) || 15;
    const chronological = [...current.videos]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, limit)
      .reverse();

    const labels = chronological.map((v, idx) => {
      const shortDate = formatShortDate(v.publishedAt);
      return shortDate || `Pub #${idx + 1}`;
    });

    const viewsData = chronological.map(v => v.views || 0);
    const likesData = chronological.map(v => v.likes || 0);
    const commentsData = chronological.map(v => v.comments || 0);
    const interactionsData = chronological.map(v => (v.likes || 0) + (v.comments || 0) + (v.shares || 0));
    const erData = chronological.map(v => Number((v.er || 0).toFixed(2)));

    const peakVideo = [...chronological].sort((a, b) => b.views - a.views)[0];
    const avgViews = Math.round(viewsData.reduce((a, b) => a + b, 0) / (viewsData.length || 1));
    const totalInter = interactionsData.reduce((a, b) => a + b, 0);
    const avgEr = (erData.reduce((a, b) => a + b, 0) / (erData.length || 1)).toFixed(2);

    const statPeakEl = document.getElementById('chartStatPeak');
    const statAvgEl = document.getElementById('chartStatAvg');
    const statInterEl = document.getElementById('chartStatInteractions');
    const statErEl = document.getElementById('chartStatAvgEr');

    if (statPeakEl) statPeakEl.textContent = peakVideo ? `${formatCompactNumber(peakVideo.views)}` : '0';
    if (statAvgEl) statAvgEl.textContent = formatCompactNumber(avgViews);
    if (statInterEl) statInterEl.textContent = formatCompactNumber(totalInter);
    if (statErEl) statErEl.textContent = `${avgEr}%`;

    let series = [];
    let colors = [];
    let yaxisConfig = [];

    if (metricMode === 'dual') {
      series = [
        { name: 'Visualizaciones', type: chartType, data: viewsData },
        { name: 'Interacciones Totales (Likes+Coments)', type: chartType === 'bar' ? 'line' : chartType, data: interactionsData }
      ];
      colors = ['#0EA5E9', '#10B981'];
      yaxisConfig = [
        {
          title: { text: 'Visualizaciones', style: { color: '#0EA5E9', fontSize: '11px', fontWeight: 700 } },
          labels: {
            style: { colors: isDark ? '#94A3B8' : '#64748B', fontSize: '11px' },
            formatter: val => formatCompactNumber(Math.round(val))
          }
        },
        {
          opposite: true,
          title: { text: 'Interacciones', style: { color: '#10B981', fontSize: '11px', fontWeight: 700 } },
          labels: {
            style: { colors: isDark ? '#94A3B8' : '#64748B', fontSize: '11px' },
            formatter: val => formatCompactNumber(Math.round(val))
          }
        }
      ];
    } else if (metricMode === 'breakdown') {
      series = [
        { name: 'Me Gusta (Likes)', type: chartType, data: likesData },
        { name: 'Comentarios', type: chartType, data: commentsData }
      ];
      colors = ['#6366F1', '#F59E0B'];
      yaxisConfig = [
        {
          title: { text: 'Me Gusta', style: { color: '#6366F1', fontSize: '11px', fontWeight: 700 } },
          labels: {
            style: { colors: isDark ? '#94A3B8' : '#64748B', fontSize: '11px' },
            formatter: val => formatCompactNumber(Math.round(val))
          }
        },
        {
          opposite: true,
          title: { text: 'Comentarios', style: { color: '#F59E0B', fontSize: '11px', fontWeight: 700 } },
          labels: {
            style: { colors: isDark ? '#94A3B8' : '#64748B', fontSize: '11px' },
            formatter: val => formatCompactNumber(Math.round(val))
          }
        }
      ];
    } else {
      series = [
        { name: 'Tasa de Interacción (ER%)', type: chartType, data: erData },
        { name: 'Visualizaciones', type: 'line', data: viewsData }
      ];
      colors = ['#8B5CF6', '#0EA5E9'];
      yaxisConfig = [
        {
          title: { text: 'ER %', style: { color: '#8B5CF6', fontSize: '11px', fontWeight: 700 } },
          labels: {
            style: { colors: isDark ? '#94A3B8' : '#64748B', fontSize: '11px' },
            formatter: val => `${Number(val).toFixed(1)}%`
          }
        },
        {
          opposite: true,
          title: { text: 'Visualizaciones', style: { color: '#0EA5E9', fontSize: '11px', fontWeight: 700 } },
          labels: {
            style: { colors: isDark ? '#94A3B8' : '#64748B', fontSize: '11px' },
            formatter: val => formatCompactNumber(Math.round(val))
          }
        }
      ];
    }

    const options = {
      chart: {
        height: 330,
        type: chartType,
        toolbar: { show: false },
        fontFamily: 'Plus Jakarta Sans, -apple-system, sans-serif',
        background: 'transparent',
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 650,
          animateGradually: { enabled: true, delay: 90 },
          dynamicAnimation: { enabled: true, speed: 350 }
        }
      },
      series,
      colors,
      stroke: {
        curve: 'smooth',
        width: chartType === 'bar' ? [0, 3] : [3, 3]
      },
      fill: {
        type: chartType === 'area' ? 'gradient' : 'solid',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.42,
          opacityTo: 0.03,
          stops: [0, 92, 100]
        }
      },
      dataLabels: { enabled: false },
      markers: {
        size: chronological.length <= 20 ? 4 : 2,
        strokeWidth: 2,
        hover: { size: 7 }
      },
      xaxis: {
        categories: labels,
        labels: {
          style: { colors: isDark ? '#94A3B8' : '#64748B', fontSize: '11px' }
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: yaxisConfig,
      grid: {
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        strokeDashArray: 4
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        labels: { colors: isDark ? '#E2E8F0' : '#1E293B' }
      },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        shared: true,
        intersect: false,
        custom: function ({ dataPointIndex }) {
          const v = chronological[dataPointIndex];
          if (!v) return '';
          return `
            <div class="p-3.5 rounded-2xl bg-slate-900/95 text-white border border-slate-700/80 shadow-2xl max-w-xs space-y-2 text-xs">
              <div class="font-extrabold text-indigo-300 line-clamp-2 leading-snug">${escapeHtml(v.title)}</div>
              <div class="text-[10px] text-slate-400 font-mono">${formatFriendlyDate(v.publishedAt)}</div>
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 font-mono text-[11px]">
                <div>Vistas: <strong class="text-sky-400">${formatNumber(v.views)}</strong></div>
                <div>Likes: <strong class="text-pink-400">${formatNumber(v.likes)}</strong></div>
                <div>Coments: <strong class="text-amber-400">${formatNumber(v.comments)}</strong></div>
                <div>ER%: <strong class="text-emerald-400">${v.er}%</strong></div>
              </div>
            </div>
          `;
        }
      }
    };

    apexMainChart = new window.ApexCharts(chartContainer, options);
    apexMainChart.render();
  }

  // ==========================================================================
  // 9. CALENDARIO EDITORIAL Y PLANIFICADOR DE PRODUCCIÓN
  // ==========================================================================
  function renderCrmCalendar() {
    const container = document.getElementById('crmCalendarList');
    if (!container) return;

    const statusBadge = {
      idea: { text: 'Idea / Borrador', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
      scripting: { text: 'En Guion / Grabación', cls: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' },
      ready: { text: 'Listo para Publicar', cls: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' },
      published: { text: 'Publicado', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' }
    };

    if (!crmState.calendarItems.length) {
      container.innerHTML = `
        <div class="p-8 text-center text-xs text-slate-400 rounded-2xl border border-dashed" style="border-color: var(--border-subtle);">
          No hay entregas agendadas. Programa tu próximo contenido en el formulario lateral.
        </div>
      `;
      return;
    }

    container.innerHTML = crmState.calendarItems.map(item => {
      const st = statusBadge[item.status] || statusBadge.idea;
      const pLogo = getPlatformLogo(item.platform);
      return `
        <div class="p-4 rounded-2xl border surface-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-500/40 transition" style="border-color: var(--border-subtle);">
          <div class="flex items-start gap-3 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 border flex items-center justify-center p-2 shrink-0" style="border-color: var(--border-subtle);">
              <img src="${pLogo}" class="w-full h-full object-contain" alt="${escapeHtml(item.platform)}" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-extrabold text-xs text-slate-900 dark:text-slate-100">${escapeHtml(item.title)}</span>
                <span class="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">${escapeHtml(item.date)}</span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                <strong class="text-indigo-500">Gancho 0-3s:</strong> "${escapeHtml(item.hook || 'Sin gancho definido')}"
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button onclick="cycleCalendarStatus('${item.id}')" title="Clic para avanzar estado" class="px-3 py-1.5 rounded-xl text-[10.5px] font-extrabold border ${st.cls} cursor-pointer transition">
              ${st.text} ↻
            </button>
            <button onclick="sendQuickPrompt('Desarrolla el guion completo segundo a segundo para mi entrega agendada: ${escapeHtml(item.title)} con el gancho: ${escapeHtml(item.hook || '')}')" class="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white text-[10.5px] font-extrabold transition flex items-center gap-1">
              <img src="logonyx.png" class="w-3.5 h-3.5 object-contain" alt="" /> Guion
            </button>
            <button onclick="deleteCalendarItem('${item.id}')" class="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition text-xs">
              ✕
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function addCalendarItem(event) {
    if (event) event.preventDefault();
    const title = (document.getElementById('calTitleInput')?.value || '').trim();
    const hook = (document.getElementById('calHookInput')?.value || '').trim();
    const platform = document.getElementById('calPlatformInput')?.value || 'tiktok';
    const date = document.getElementById('calDateInput')?.value || new Date().toISOString().slice(0, 10);
    const status = document.getElementById('calStatusInput')?.value || 'idea';

    if (!title) {
      showToast({ type: 'warning', title: 'Título requerido', message: 'Escribe el título o tema de la publicación a programar.' });
      return;
    }

    crmState.calendarItems.unshift({
      id: 'cal_' + Date.now(),
      title,
      hook,
      platform,
      date,
      status
    });

    saveSpace();
    renderCrmCalendar();
    if (document.getElementById('calTitleInput')) document.getElementById('calTitleInput').value = '';
    if (document.getElementById('calHookInput')) document.getElementById('calHookInput').value = '';
    showToast({
      type: 'success',
      title: 'Contenido Programado',
      message: `"${title}" se añadió al Calendario Editorial.`,
      iconImg: getPlatformLogo(platform)
    });
  }

  function cycleCalendarStatus(itemId) {
    const order = ['idea', 'scripting', 'ready', 'published'];
    const item = crmState.calendarItems.find(i => i.id === itemId);
    if (!item) return;
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    item.status = next;
    saveSpace();
    renderCrmCalendar();
  }

  function deleteCalendarItem(itemId) {
    crmState.calendarItems = crmState.calendarItems.filter(i => i.id !== itemId);
    saveSpace();
    renderCrmCalendar();
  }

  // ==========================================================================
  // 10. ESTUDIO PRO: TARIFARIO EXPLICADO, LABORATORIO DE GUIONES Y CONSTRUCTOR UTM
  // ==========================================================================
  function updateStudioCalculator(field, val) {
    const numVal = Number(val);
    if (field === 'nicheCpm' && numVal > 0) crmState.studioConfig.nicheCpm = numVal;
    if (field === 'rightsMultiplier' && numVal > 0) crmState.studioConfig.rightsMultiplier = numVal;
    saveSpace();
    renderCrmStudio();
  }

  function calculateDynamicRates() {
    const current = getActiveAccount();
    const followers = current ? current.followers : 0;
    const er = current ? current.engagementRate : 0;
    const vids = current && Array.isArray(current.videos) ? current.videos : [];
    const avgViews = vids.length > 0
      ? Math.round(vids.reduce((s, v) => s + v.views, 0) / vids.length)
      : Math.round(followers * 0.25);

    const baseCpm = Number(crmState.studioConfig.nicheCpm || 24);
    const rightsMult = Number(crmState.studioConfig.rightsMultiplier || 1);
    const erMultiplier = Math.max(1, Math.min(2.6, 1 + (er / 10)));

    // Cálculo transparente basado en estándares reales de agencias de Influencer Marketing
    const rawSingle = ((Math.max(avgViews, 2000) / 1000) * baseCpm * erMultiplier + (followers * 0.0018)) * rightsMult;
    const singleVideoRate = Math.max(45, Math.round(rawSingle / 5) * 5);
    const bundle3Rate = Math.round((singleVideoRate * 3 * 0.85) / 5) * 5;
    const mentionRate = Math.max(30, Math.round((singleVideoRate * 0.55) / 5) * 5);
    const storyPackRate = Math.max(25, Math.round((singleVideoRate * 0.40) / 5) * 5);

    return {
      current,
      followers,
      er,
      avgViews,
      baseCpm,
      rightsMult,
      erMultiplier: Number(erMultiplier.toFixed(2)),
      singleVideoRate,
      bundle3Rate,
      mentionRate,
      storyPackRate
    };
  }

  function renderCrmStudio() {
    const calc = calculateDynamicRates();

    const rateSingleEl = document.getElementById('studioRateSingle');
    const rateBundleEl = document.getElementById('studioRateBundle');
    const rateMentionEl = document.getElementById('studioRateMention');
    const rateStoryEl = document.getElementById('studioRateStory');
    const rateContextEl = document.getElementById('studioRateAccountContext');
    const formulaBoxEl = document.getElementById('studioFormulaExplanation');

    if (rateSingleEl) rateSingleEl.textContent = `$${formatNumber(calc.singleVideoRate)} USD`;
    if (rateBundleEl) rateBundleEl.textContent = `$${formatNumber(calc.bundle3Rate)} USD`;
    if (rateMentionEl) rateMentionEl.textContent = `$${formatNumber(calc.mentionRate)} USD`;
    if (rateStoryEl) rateStoryEl.textContent = `$${formatNumber(calc.storyPackRate)} USD`;

    if (rateContextEl) {
      rateContextEl.textContent = calc.current
        ? `Cotización calculada en vivo para ${calc.current.handle} (${formatNumber(calc.followers)} seguidores • Promedio ${formatNumber(calc.avgViews)} vistas/video • ER ${calc.er}%)`
        : 'Simulación base activa — Conecta tu cuenta oficial vía OAuth 2.0 para personalizar las tarifas con tu alcance real.';
    }

    if (formulaBoxEl) {
      formulaBoxEl.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span class="font-extrabold text-indigo-600 dark:text-indigo-400">Fórmula Aplicada en Vivo:</span>
          <span class="font-mono bg-slate-900 text-emerald-400 px-2.5 py-1 rounded-xl text-[10.5px]">
            (${formatNumber(calc.avgViews)} vistas prom. ÷ 1.000) × $${calc.baseCpm} CPM × ${calc.erMultiplier}x Bono ER × ${calc.rightsMult}x Derechos
          </span>
        </div>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
          <strong>¿Por qué cobras este valor?</strong> Las marcas pagan por el <em>alcance garantizado</em> (CPM por cada 1.000 reproducciones reales) multiplicado por la <em>fidelidad de tu comunidad</em> (tu ER% de ${calc.er}% otorga un multiplicador de <strong>${calc.erMultiplier}x</strong>) más el tipo de licencia comercial elegida.
        </p>
      `;
    }

    // Renderizar Bóveda de Guiones Estructurados
    const scriptsEl = document.getElementById('savedScriptsContainer');
    if (scriptsEl) {
      if (!crmState.savedScripts.length) {
        scriptsEl.innerHTML = `<div class="text-xs text-slate-400 py-4 text-center">No hay guiones guardados en la bóveda todavía.</div>`;
      } else {
        scriptsEl.innerHTML = crmState.savedScripts.map(scr => `
          <div class="p-4 rounded-2xl border surface-card space-y-2.5 hover:border-indigo-500/40 transition" style="border-color: var(--border-subtle);">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <img src="${getPlatformLogo(scr.platform || 'tiktok')}" class="w-4 h-4 object-contain shrink-0" alt="" />
                <span class="font-extrabold text-xs text-indigo-600 dark:text-indigo-400 truncate">${escapeHtml(scr.title)}</span>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <button onclick="copySavedScript('${scr.id}')" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-[10px] font-bold transition">
                  Copiar
                </button>
                <button onclick="deleteSavedScript('${scr.id}')" class="p-1 text-slate-400 hover:text-red-500 text-xs">✕</button>
              </div>
            </div>
            ${scr.hook ? `
              <div class="grid grid-cols-1 gap-1.5 text-[11px]">
                <div class="p-2 rounded-xl bg-indigo-500/8 border border-indigo-500/20">
                  <strong class="text-indigo-500 uppercase text-[9.5px] block">1. Gancho Visual y Verbal (0 a 3 seg):</strong>
                  <span class="text-slate-700 dark:text-slate-200">${escapeHtml(scr.hook)}</span>
                </div>
                <div class="p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/50">
                  <strong class="text-sky-500 uppercase text-[9.5px] block">2. Desarrollo de Retención (3 a 35 seg):</strong>
                  <span class="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">${escapeHtml(scr.body || '')}</span>
                </div>
                <div class="p-2 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                  <strong class="text-emerald-500 uppercase text-[9.5px] block">3. Llamado a la Acción / Conversión (35 a 45 seg):</strong>
                  <span class="text-slate-700 dark:text-slate-200">${escapeHtml(scr.cta || '')}</span>
                </div>
              </div>
            ` : `
              <p class="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">${escapeHtml(scr.body)}</p>
            `}
          </div>
        `).join('');
      }
    }

    // Renderizar Historial de Enlaces UTM
    const utmListEl = document.getElementById('utmHistoryContainer');
    if (utmListEl) {
      if (!crmState.utmLinks.length) {
        utmListEl.innerHTML = `<div class="text-xs text-slate-400 py-3">Aún no has generado enlaces de rastreo UTM. Usa un preset rápido arriba o completa los campos.</div>`;
      } else {
        utmListEl.innerHTML = crmState.utmLinks.map(u => `
          <div class="p-3 rounded-2xl border surface-card flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs" style="border-color: var(--border-subtle);">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 mb-1">
                <img src="${getPlatformLogo(u.source)}" class="w-3.5 h-3.5 object-contain" alt="" />
                <span class="text-[10px] font-extrabold uppercase text-indigo-500">${escapeHtml(u.source)} / ${escapeHtml(u.medium || 'social')} • ${escapeHtml(u.campaign)}</span>
              </div>
              <div class="font-mono text-[10.5px] text-slate-600 dark:text-slate-300 truncate">${escapeHtml(u.url)}</div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button onclick="navigator.clipboard.writeText('${escapeHtml(u.url)}'); showToast({type:'success', title:'Enlace UTM Copiado', message:'Listo para pegar en tu biografía, historia o descripción.'});" class="px-3 py-1.5 rounded-xl bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 font-extrabold text-[10.5px] hover:bg-indigo-600 hover:text-white transition">
                Copiar URL
              </button>
              <button onclick="deleteUtmLink('${u.id}')" class="p-1.5 text-slate-400 hover:text-red-500 text-xs">✕</button>
            </div>
          </div>
        `).join('');
      }
    }

    updateUtmLivePreview();
  }

  function copyMediaKitQuote() {
    const calc = calculateDynamicRates();
    const accName = calc.current ? `${calc.current.name} (${calc.current.handle})` : 'Mi Canal Oficial';
    const quoteText =
      `PROPUESTA COMERCIAL & MEDIA KIT • ${accName.toUpperCase()}\n` +
      `• Comunidad Verificada: ${formatNumber(calc.followers)} seguidores\n` +
      `• Alcance Promedio por Publicación: ${formatNumber(calc.avgViews)} visualizaciones\n` +
      `• Tasa de Interacción Oficial (ER%): ${calc.er}%\n\n` +
      `TARIFARIO DE COLABORACIONES:\n` +
      `1. Video Dedicado Exclusivo (45-60s): $${formatNumber(calc.singleVideoRate)} USD\n` +
      `2. Pack Campaña 3 Videos (-15% Bonificado): $${formatNumber(calc.bundle3Rate)} USD\n` +
      `3. Mención Integrada Orgánica (15-20s): $${formatNumber(calc.mentionRate)} USD\n` +
      `4. Secuencia de 3 Stories con Link Directo: $${formatNumber(calc.storyPackRate)} USD`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(quoteText).catch(() => {});
    }
    showToast({
      type: 'success',
      title: 'Cotización Media Kit Copiada',
      message: 'El resumen ejecutivo con tus métricas y tarifas está en tu portapapeles listo para enviar a marcas.'
    });
  }

  function applyScriptTemplate(templateKey) {
    const titleEl = document.getElementById('scriptVaultTitle');
    const hookEl = document.getElementById('scriptVaultHook');
    const bodyEl = document.getElementById('scriptVaultBody');
    const ctaEl = document.getElementById('scriptVaultCta');

    const templates = {
      myth: {
        title: 'Estructura Mito vs. Realidad (Alta Retención)',
        hook: 'El 90% cree que necesita [Creencia Común], pero los datos demuestran exactamente lo contrario.',
        body: '• Segundo 3-12: Muestra la prueba visual de por qué el método tradicional falla.\n• Segundo 12-28: Revela el ajuste exacto en 2 pasos simples.\n• Segundo 28-35: Muestra el antes y después real.',
        cta: 'Comenta la palabra "GUÍA" y ve al enlace de mi perfil para acceder al recurso paso a paso.'
      },
      mistakes: {
        title: 'Los 3 Errores Silenciosos (Disparador de Guardados)',
        hook: 'Si haces esto en los primeros 5 segundos, estás perdiendo la mitad de tus resultados sin darte cuenta.',
        body: '• Error #1 (Seg 3-12): Explicación directa y visual.\n• Error #2 (Seg 12-22): El fallo más común y cómo corregirlo hoy.\n• Error #3 (Seg 22-35): El secreto que usan los perfiles top del sector.',
        cta: 'Guarda este video para revisarlo antes de tu próxima entrega y sígueme para la parte 2.'
      },
      case_study: {
        title: 'Caso de Estudio Real / Demostración Paso a Paso',
        hook: 'Así pasamos de [Situación Inicial] a [Resultado Medible] aplicando este sistema de 3 pasos.',
        body: '• Paso 1 (Diagnóstico): Qué detectamos que frenaba el crecimiento.\n• Paso 2 (Ejecución): Qué cambiamos exactamente en la estructura.\n• Paso 3 (Resultado): Métricas finales obtenidas.',
        cta: 'Entra al link de mi biografía si quieres que apliquemos esta misma estructura en tu proyecto.'
      }
    };

    const chosen = templates[templateKey];
    if (!chosen) return;
    if (titleEl) titleEl.value = chosen.title;
    if (hookEl) hookEl.value = chosen.hook;
    if (bodyEl) bodyEl.value = chosen.body;
    if (ctaEl) ctaEl.value = chosen.cta;

    showToast({
      type: 'info',
      title: 'Plantilla Cargada en el Editor',
      message: 'Personaliza los campos entre corchetes y guárdala en tu Bóveda.'
    });
  }

  function saveScriptToVault(event) {
    if (event) event.preventDefault();
    const title = (document.getElementById('scriptVaultTitle')?.value || '').trim();
    const hook = (document.getElementById('scriptVaultHook')?.value || '').trim();
    const body = (document.getElementById('scriptVaultBody')?.value || '').trim();
    const cta = (document.getElementById('scriptVaultCta')?.value || '').trim();
    const platform = document.getElementById('scriptVaultPlatform')?.value || 'tiktok';

    if (!title || !body) {
      showToast({ type: 'warning', title: 'Campos incompletos', message: 'Completa el título y el desarrollo del guion.' });
      return;
    }

    crmState.savedScripts.unshift({
      id: 'scr_' + Date.now(),
      title,
      platform,
      hook,
      body,
      cta,
      createdAt: new Date().toISOString()
    });

    saveSpace();
    renderCrmStudio();
    if (document.getElementById('scriptVaultTitle')) document.getElementById('scriptVaultTitle').value = '';
    if (document.getElementById('scriptVaultHook')) document.getElementById('scriptVaultHook').value = '';
    if (document.getElementById('scriptVaultBody')) document.getElementById('scriptVaultBody').value = '';
    if (document.getElementById('scriptVaultCta')) document.getElementById('scriptVaultCta').value = '';
    showToast({ type: 'success', title: 'Guion Guardado en Bóveda', message: `"${title}" quedó almacenado y estructurado.` });
  }

  function copySavedScript(scriptId) {
    const scr = crmState.savedScripts.find(s => s.id === scriptId);
    if (!scr) return;
    const text = `[TÍTULO]: ${scr.title}\n[GANCHO 0-3s]: ${scr.hook || ''}\n[DESARROLLO 3-35s]:\n${scr.body || ''}\n[CTA 35-45s]: ${scr.cta || ''}`;
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    showToast({ type: 'success', title: 'Guion Copiado', message: 'Estructura completa copiada al portapapeles.' });
  }

  function deleteSavedScript(scriptId) {
    crmState.savedScripts = crmState.savedScripts.filter(s => s.id !== scriptId);
    saveSpace();
    renderCrmStudio();
  }

  function applyUtmPreset(presetKey) {
    const sourceEl = document.getElementById('utmSource');
    const mediumEl = document.getElementById('utmMedium');
    const campaignEl = document.getElementById('utmCampaign');
    const contentEl = document.getElementById('utmContent');

    if (presetKey === 'tiktok_bio') {
      if (sourceEl) sourceEl.value = 'tiktok';
      if (mediumEl) mediumEl.value = 'bio_link';
      if (campaignEl) campaignEl.value = 'captacion_organica';
      if (contentEl) contentEl.value = 'perfil_principal';
    } else if (presetKey === 'ig_story') {
      if (sourceEl) sourceEl.value = 'instagram';
      if (mediumEl) mediumEl.value = 'story_sticker';
      if (campaignEl) campaignEl.value = 'oferta_semanal';
      if (contentEl) contentEl.value = 'secuencia_stories';
    } else if (presetKey === 'yt_desc') {
      if (sourceEl) sourceEl.value = 'youtube';
      if (mediumEl) mediumEl.value = 'video_description';
      if (campaignEl) campaignEl.value = 'embudo_autoridad';
      if (contentEl) contentEl.value = 'primer_link_fijado';
    }
    updateUtmLivePreview();
  }

  function updateUtmLivePreview() {
    const previewEl = document.getElementById('utmLivePreviewBox');
    if (!previewEl) return;

    let baseUrl = (document.getElementById('utmBaseUrl')?.value || 'https://cvstudio33.com.ar').trim();
    const source = (document.getElementById('utmSource')?.value || 'tiktok').trim();
    const medium = (document.getElementById('utmMedium')?.value || 'bio_link').trim();
    const campaign = (document.getElementById('utmCampaign')?.value || 'crecimiento_2026').trim().replace(/\s+/g, '_').toLowerCase();
    const content = (document.getElementById('utmContent')?.value || '').trim().replace(/\s+/g, '_').toLowerCase();

    if (!/^https?:\/\//i.test(baseUrl)) baseUrl = 'https://' + baseUrl;
    const sep = baseUrl.includes('?') ? '&' : '?';
    const fullUrl = `${baseUrl}${sep}utm_source=${encodeURIComponent(source)}&utm_medium=${encodeURIComponent(medium)}&utm_campaign=${encodeURIComponent(campaign)}${content ? `&utm_content=${encodeURIComponent(content)}` : ''}`;
    previewEl.textContent = fullUrl;
  }

  function generateUtmLink(event) {
    if (event) event.preventDefault();
    let baseUrl = (document.getElementById('utmBaseUrl')?.value || 'https://cvstudio33.com.ar').trim();
    const source = (document.getElementById('utmSource')?.value || 'tiktok').trim();
    const medium = (document.getElementById('utmMedium')?.value || 'bio_link').trim();
    const campaign = (document.getElementById('utmCampaign')?.value || 'crecimiento_2026').trim().replace(/\s+/g, '_').toLowerCase();
    const content = (document.getElementById('utmContent')?.value || '').trim().replace(/\s+/g, '_').toLowerCase();

    if (!/^https?:\/\//i.test(baseUrl)) baseUrl = 'https://' + baseUrl;
    const sep = baseUrl.includes('?') ? '&' : '?';
    const fullUrl = `${baseUrl}${sep}utm_source=${encodeURIComponent(source)}&utm_medium=${encodeURIComponent(medium)}&utm_campaign=${encodeURIComponent(campaign)}${content ? `&utm_content=${encodeURIComponent(content)}` : ''}`;

    crmState.utmLinks.unshift({
      id: 'utm_' + Date.now(),
      source,
      medium,
      campaign,
      url: fullUrl
    });

    saveSpace();
    renderCrmStudio();

    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl).catch(() => {});
    }

    showToast({
      type: 'success',
      title: 'Enlace UTM Generado y Copiado',
      message: fullUrl,
      iconImg: getPlatformLogo(source)
    });
  }

  function deleteUtmLink(utmId) {
    crmState.utmLinks = crmState.utmLinks.filter(u => u.id !== utmId);
    saveSpace();
    renderCrmStudio();
  }

  // ==========================================================================
  // 11. RADAR DE COMPETENCIA (@) EN TIEMPO REAL (ÚNICO LUGAR DE BÚSQUEDA POR @)
  // ==========================================================================
  async function searchCompetitor() {
    const input = document.getElementById('radarSearchInput');
    const platformSel = document.getElementById('radarPlatformSelect');
    const resultContainer = document.getElementById('radarResultContainer');

    if (!input || !input.value.trim()) {
      showToast({
        type: 'warning',
        title: 'Ingresa un @usuario a investigar',
        message: 'Escribe el handle público del competidor o referente (ej: @usuario) para escanearlo en el Radar.'
      });
      return;
    }

    const handle = input.value.trim().replace(/^@/, '');
    const platform = platformSel ? platformSel.value : 'tiktok';
    const pLogo = getPlatformLogo(platform);

    if (resultContainer) {
      resultContainer.innerHTML = `
        <div class="p-10 rounded-3xl border surface-card flex flex-col items-center justify-center text-center space-y-3" style="border-color: var(--border-subtle);">
          <img src="${pLogo}" class="w-11 h-11 object-contain animate-bounce" alt="" />
          <div class="text-sm font-extrabold">Escaneando perfil público @${escapeHtml(handle)} en ${platform.toUpperCase()}...</div>
          <p class="text-xs text-slate-400 max-w-md">Extrayendo audiencia, visualizaciones, ER% y galería de publicaciones para compararlos con tu cuenta oficial.</p>
        </div>
      `;
    }

    try {
      const res = await fetch(`${crmState.workerUrl}/api/radar/inspect?platform=${encodeURIComponent(platform)}&handle=${encodeURIComponent(handle)}`);
      const data = await res.json();

      if (!res.ok || !data || !data.ok || !data.profile) {
        throw new Error(data?.error || 'No se pudo obtener información pública de ese perfil.');
      }

      const comp = data.profile;
      comp.videos = (Array.isArray(comp.videos) ? comp.videos : []).map((v, i) => normalizeVideo(v, platform, i)).filter(Boolean);
      crmState.radarLastResult = comp;

      const myAcc = getActiveAccount();
      const myFollowers = myAcc ? myAcc.followers : 0;
      const myEr = myAcc ? myAcc.engagementRate : 0;
      const myAvgViews = myAcc && myAcc.videos?.length
        ? Math.round(myAcc.videos.reduce((s, v) => s + v.views, 0) / myAcc.videos.length)
        : 0;
      const compAvgViews = comp.avgViewsPerPost || (comp.videos.length ? Math.round(comp.videos.reduce((s, v) => s + v.views, 0) / comp.videos.length) : 0);

      if (resultContainer) {
        resultContainer.innerHTML = `
          <div class="space-y-6">
            <!-- Cabecera del Competidor Escaneado -->
            <div class="p-6 rounded-3xl border surface-card flex flex-col md:flex-row md:items-center justify-between gap-4" style="border-color: var(--border-subtle);">
              <div class="flex items-center gap-4">
                <div class="relative shrink-0">
                  <img src="${escapeHtml(comp.avatar || pLogo)}" referrerpolicy="no-referrer" onerror="this.src='${pLogo}'" class="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500/30 shadow-md" />
                  <img src="${pLogo}" class="w-5 h-5 rounded-full bg-white dark:bg-slate-900 p-0.5 absolute -bottom-1 -right-1 shadow" alt="" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="text-lg font-extrabold">${escapeHtml(comp.displayName || comp.handle)}</h3>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-500/15 text-indigo-500">${escapeHtml(comp.platform)}</span>
                  </div>
                  <p class="text-xs text-slate-400">${escapeHtml(comp.handle)} ${comp.bio ? '• ' + escapeHtml(comp.bio) : ''}</p>
                </div>
              </div>
              <button onclick="sendQuickPrompt('Compara mi cuenta activa con el competidor ${escapeHtml(comp.handle)} (${formatNumber(comp.followers)} seguidores, ER ${comp.engagementRate}%, promedio ${formatNumber(compAvgViews)} vistas/post) y dime 3 acciones tácticas para superarlo.')" class="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition shadow-xs shrink-0 flex items-center gap-2">
                <img src="logonyx.png" class="w-4 h-4 object-contain" alt="" />
                <span>Generar Estrategia Anti-Competencia con NYX</span>
              </button>
            </div>

            <!-- Comparativa Head-to-Head -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="p-5 rounded-3xl border surface-card space-y-2" style="border-color: var(--border-subtle);">
                <div class="text-[11px] font-bold text-slate-400 uppercase">Comunidad (Seguidores)</div>
                <div class="flex items-baseline justify-between">
                  <div>
                    <div class="text-[10px] text-slate-400">Competidor (${escapeHtml(comp.handle)})</div>
                    <div class="text-xl font-extrabold font-mono text-indigo-500">${formatNumber(comp.followers)}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-[10px] text-slate-400">Tu Cuenta (${myAcc ? escapeHtml(myAcc.handle) : 'Sin conectar'})</div>
                    <div class="text-lg font-bold font-mono text-slate-600 dark:text-slate-300">${formatNumber(myFollowers)}</div>
                  </div>
                </div>
              </div>

              <div class="p-5 rounded-3xl border surface-card space-y-2" style="border-color: var(--border-subtle);">
                <div class="text-[11px] font-bold text-slate-400 uppercase">Tasa de Interacción (ER%)</div>
                <div class="flex items-baseline justify-between">
                  <div>
                    <div class="text-[10px] text-slate-400">Competidor</div>
                    <div class="text-xl font-extrabold font-mono text-emerald-500">${comp.engagementRate}%</div>
                  </div>
                  <div class="text-right">
                    <div class="text-[10px] text-slate-400">Tu Cuenta</div>
                    <div class="text-lg font-bold font-mono text-slate-600 dark:text-slate-300">${myEr}%</div>
                  </div>
                </div>
              </div>

              <div class="p-5 rounded-3xl border surface-card space-y-2" style="border-color: var(--border-subtle);">
                <div class="text-[11px] font-bold text-slate-400 uppercase">Promedio Vistas / Video</div>
                <div class="flex items-baseline justify-between">
                  <div>
                    <div class="text-[10px] text-slate-400">Competidor</div>
                    <div class="text-xl font-extrabold font-mono text-sky-500">${formatNumber(compAvgViews)}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-[10px] text-slate-400">Tu Cuenta</div>
                    <div class="text-lg font-bold font-mono text-slate-600 dark:text-slate-300">${formatNumber(myAvgViews)}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Galería de Publicaciones Extraídas del Competidor -->
            <div class="p-5 sm:p-6 rounded-3xl border surface-card space-y-4" style="border-color: var(--border-subtle);">
              <h4 class="font-extrabold text-sm">Galería de Publicaciones Detectadas de ${escapeHtml(comp.handle)} (${comp.videos.length})</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                ${comp.videos.slice(0, 6).map(v => buildVideoGalleryCard(v, comp.platform, compAvgViews)).join('')}
              </div>
            </div>
          </div>
        `;
      }
    } catch (err) {
      if (resultContainer) {
        resultContainer.innerHTML = `
          <div class="p-8 rounded-3xl border border-red-500/30 bg-red-500/5 text-center space-y-2">
            <div class="text-sm font-extrabold text-red-500">No se pudo completar la inspección</div>
            <p class="text-xs text-slate-400">${escapeHtml(err.message || 'Verifica el nombre de usuario e intenta nuevamente.')}</p>
          </div>
        `;
      }
    }
  }

  // ==========================================================================
  // 12. AUDITORÍA EJECUTIVA DE CRECIMIENTO (6 DIMENSIONES + IA PRO)
  // ==========================================================================
  function renderAuditSection() {
    const current = getActiveAccount();
    const scoreRingEl = document.getElementById('auditSvgRingProgress');
    const scoreNumEl = document.getElementById('auditScoreHeading');
    const gradeEl = document.getElementById('auditGradeBadge');
    const summaryEl = document.getElementById('auditScoreSummary');
    const dimensionsEl = document.getElementById('auditDimensionsGrid');
    const topVsLowEl = document.getElementById('auditTopVsLowContainer');
    const strengthsEl = document.getElementById('auditStrengthsList');
    const weaknessesEl = document.getElementById('auditWeaknessesList');

    if (!current) {
      if (scoreNumEl) scoreNumEl.textContent = '--/100';
      if (gradeEl) gradeEl.textContent = 'SIN DATOS';
      if (summaryEl) summaryEl.textContent = 'Conecta una cuenta oficial mediante OAuth 2.0 (Meta, TikTok o Google) para ejecutar la auditoría algorítmica.';
      if (dimensionsEl) dimensionsEl.innerHTML = '';
      if (topVsLowEl) topVsLowEl.innerHTML = '';
      return;
    }

    const vids = current.videos || [];
    const er = Number(current.engagementRate || 0);
    const followers = Number(current.followers || 0);
    const avgViews = vids.length > 0 ? Math.round(vids.reduce((s, v) => s + v.views, 0) / vids.length) : 0;

    const hookScore = Math.min(98, Math.max(55, Math.round(62 + Math.min(32, (avgViews / Math.max(followers, 100)) * 45))));
    const erScore = Math.min(99, Math.max(50, Math.round(55 + er * 4.2)));
    const cadenceScore = Math.min(96, Math.max(48, vids.length >= 15 ? 92 : (vids.length >= 8 ? 80 : 64)));
    const communityScore = Math.min(97, Math.max(52, Math.round(60 + Math.min(35, er * 3.5))));
    const seoScore = Math.min(95, Math.max(60, vids.some(v => v.title && v.title.length > 25) ? 88 : 68));
    const conversionScore = Math.min(98, Math.max(55, (crmState.utmLinks.length > 0 ? 85 : 64) + (crmState.savedScripts.length >= 2 ? 10 : 0)));

    const overallScore = Math.round((hookScore + erScore + cadenceScore + communityScore + seoScore + conversionScore) / 6);
    const grade = overallScore >= 90 ? 'A+' : (overallScore >= 82 ? 'A' : (overallScore >= 74 ? 'B+' : 'B'));

    if (scoreNumEl) scoreNumEl.textContent = `${overallScore}/100`;
    if (gradeEl) gradeEl.textContent = `GRADO ${grade}`;
    if (scoreRingEl) {
      const circumference = 326.7;
      const offset = circumference - (overallScore / 100) * circumference;
      scoreRingEl.style.strokeDashoffset = String(offset);
    }

    if (summaryEl) {
      summaryEl.textContent = `Diagnóstico calculado sobre ${vids.length} publicaciones verificadas de ${current.name} (${current.handle}), ${formatNumber(followers)} seguidores y un ER real de ${er}%.`;
    }

    if (dimensionsEl) {
      const dims = [
        { label: 'Retención & Gancho (0-3s)', val: hookScore, color: 'bg-indigo-500' },
        { label: 'Ratio de Interacción (ER%)', val: erScore, color: 'bg-emerald-500' },
        { label: 'Cadencia & Consistencia', val: cadenceScore, color: 'bg-sky-500' },
        { label: 'Debate en Comentarios', val: communityScore, color: 'bg-purple-500' },
        { label: 'Indexación SEO & Copy', val: seoScore, color: 'bg-amber-500' },
        { label: 'Trazabilidad UTM & Monetización', val: conversionScore, color: 'bg-pink-500' }
      ];

      dimensionsEl.innerHTML = dims.map(d => `
        <div class="p-3.5 rounded-2xl border surface-card space-y-2" style="border-color: var(--border-subtle);">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-slate-600 dark:text-slate-300">${d.label}</span>
            <span class="font-mono font-extrabold">${d.val}/100</span>
          </div>
          <div class="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div class="h-full rounded-full ${d.color} transition-all duration-700" style="width: ${d.val}%"></div>
          </div>
        </div>
      `).join('');
    }

    if (topVsLowEl) {
      if (vids.length >= 2) {
        const sortedByViews = [...vids].sort((a, b) => b.views - a.views);
        const topV = sortedByViews[0];
        const lowV = sortedByViews[sortedByViews.length - 1];

        topVsLowEl.innerHTML = `
          <div class="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center gap-1">
                <img src="logo.png" class="w-3 h-3 object-contain" alt="" /> Mayor Rendimiento Real
              </span>
              <span class="text-xs font-mono font-bold text-emerald-500">${formatNumber(topV.views)} vistas • ER ${topV.er}%</span>
            </div>
            <div class="text-xs font-extrabold line-clamp-2">${escapeHtml(topV.title)}</div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">Superó el promedio del canal en un <strong>${avgViews > 0 ? Math.round(((topV.views - avgViews) / avgViews) * 100) : 100}%</strong>. Replica su estructura en el Laboratorio de Guiones.</p>
          </div>

          <div class="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 flex items-center gap-1">
                <img src="logo.png" class="w-3 h-3 object-contain" alt="" /> Oportunidad de Optimización
              </span>
              <span class="text-xs font-mono font-bold text-amber-500">${formatNumber(lowV.views)} vistas • ER ${lowV.er}%</span>
            </div>
            <div class="text-xs font-extrabold line-clamp-2">${escapeHtml(lowV.title)}</div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">Menor velocidad inicial de distribución. Prueba re-empaquetar el tema con un gancho de ruptura en los primeros 2.5 segundos.</p>
          </div>
        `;
      } else {
        topVsLowEl.innerHTML = `<div class="col-span-2 text-xs text-slate-400 py-4">Sincroniza al menos 2 publicaciones para comparar tu pieza líder frente a la de menor alcance.</div>`;
      }
    }

    if (strengthsEl) {
      const sList = [
        er >= 5
          ? `Tasa de interacción activa (${er}%) por encima de la media estándar del sector (3.8%).`
          : `Audiencia base de ${formatNumber(followers)} seguidores verificada mediante OAuth 2.0.`,
        vids[0]
          ? `Capacidad demostrada de alcance con picos de ${formatNumber( Math.max(...vids.map(v => v.views)) )} reproducciones.`
          : 'Conexión oficial verificada con actualización en tiempo real.',
        `Galería de ${vids.length} publicaciones indexadas y listas para auditoría individual con NYX.`
      ];
      strengthsEl.innerHTML = sList.map(t => `<li class="flex items-start gap-2.5 text-xs"><img src="logo.png" class="w-4 h-4 object-contain mt-0.5 shrink-0" alt="" /><span>${escapeHtml(t)}</span></li>`).join('');
    }

    if (weaknessesEl) {
      const wList = [
        er < 4.5
          ? 'Incrementar la proporción de comentarios y compartidos mediante preguntas directas al cierre del video.'
          : 'Aprovechar el alto ER% fijando un comentario que dirija tráfico hacia tu enlace rastreado con UTM.',
        'Sistematizar 3 a 4 entregas semanales en el Calendario Editorial para estabilizar el piso de vistas.'
      ];
      weaknessesEl.innerHTML = wList.map(t => `<li class="flex items-start gap-2.5 text-xs"><img src="logo.png" class="w-4 h-4 object-contain mt-0.5 shrink-0" alt="" /><span>${escapeHtml(t)}</span></li>`).join('');
    }

    ['item_hook', 'item_cta', 'item_schedule', 'item_crm', 'item_replicate'].forEach(k => {
      const cb = document.getElementById(`auditCheck_${k}`);
      if (cb) cb.checked = Boolean(crmState.auditChecklist[k]);
    });
  }

  function toggleAuditCheck(key) {
    crmState.auditChecklist[key] = !crmState.auditChecklist[key];
    saveSpace();
    renderAuditSection();
  }

  async function runDeepAiAudit() {
    const current = getActiveAccount();
    if (!current) {
      showToast({
        type: 'warning',
        title: 'Conecta una cuenta primero',
        message: 'Vincula una cuenta oficial mediante Meta, TikTok o Google para ejecutar el diagnóstico IA.'
      });
      return;
    }

    const btn = document.getElementById('runDeepAuditBtn');
    const origText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<img src="logonyx.png" class="w-4 h-4 object-contain animate-spin inline-block mr-2" alt="" /> Ejecutando Auditoría Profunda NYX...`;
    }

    try {
      const res = await fetch(`${crmState.workerUrl}/api/ai/diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: buildFullPanelContext() })
      });
      const data = await res.json();
      if (data.ok && data.report) {
        const rep = data.report;
        const summaryEl = document.getElementById('auditScoreSummary');
        if (summaryEl && rep.summary) summaryEl.textContent = rep.summary;
        showToast({
          type: 'success',
          title: `Auditoría NYX Completada (Grado ${rep.grade || 'A'})`,
          message: 'Se actualizaron los indicadores estratégicos con los datos en vivo de tu cuenta.',
          iconImg: 'logonyx.png'
        });
      }
    } catch (e) {
      showToast({
        type: 'info',
        title: 'Auditoría Local Actualizada',
        message: 'Se recalcularon las 6 dimensiones sobre tus métricas actuales.'
      });
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    }
  }

  // ==========================================================================
  // 13. CONEXIÓN EXCLUSIVA OAUTH 2.0 OFICIAL (META, TIKTOK & GOOGLE/YOUTUBE)
  // ==========================================================================
  async function startOAuthFlow(provider) {
    try {
      const statusRes = await fetch(`${crmState.workerUrl}/api/auth/status`);
      if (statusRes.ok) {
        const st = await statusRes.json();
        const provKey = provider === 'youtube' ? 'google' : provider;
        if (st?.providers?.[provKey] && !st.providers[provKey].configured) {
          showToast({
            type: 'warning',
            title: `Configuración OAuth 2.0 Pendiente (${provider.toUpperCase()})`,
            message: `Agrega las llaves oficiales de ${st.providers[provKey].name} en Cloudflare Worker → Settings → Variables para iniciar sesión segura.`,
            iconImg: getPlatformLogo(provider),
            duration: 6000
          });
          return;
        }
      }
    } catch (e) {}

    const returnUri = window.location.origin + window.location.pathname;
    const endpoint = provider === 'youtube' ? 'google' : provider;
    window.location.href = `${crmState.workerUrl}/api/auth/${endpoint}/start?redirect_uri=${encodeURIComponent(returnUri)}`;
  }

  function connectGoogle() { startOAuthFlow('youtube'); }
  function connectInstagram() { startOAuthFlow('instagram'); }
  function connectTikTok() { startOAuthFlow('tiktok'); }

  function checkUrlForAuthCallback() {
    const url = new URL(window.location.href);
    const successProvider = url.searchParams.get('oauth_success');
    const unconfProvider = url.searchParams.get('oauth_unconfigured') || url.searchParams.get('oauth_demo');
    const errorProvider = url.searchParams.get('oauth_error');

    if (successProvider) {
      const handle = url.searchParams.get('handle') || '@cuenta';
      const name = url.searchParams.get('name') || handle;
      const followers = Number(url.searchParams.get('followers')) || 0;
      const likes = Number(url.searchParams.get('likes')) || 0;
      const er = Number(url.searchParams.get('er')) || 0;
      const totalViews = Number(url.searchParams.get('views')) || 0;
      const mediaCount = Number(url.searchParams.get('media')) || 0;
      const avatar = url.searchParams.get('avatar') || getPlatformLogo(successProvider);
      const session = url.searchParams.get('session') || '';

      const newAccount = normalizeAccount({
        id: `acc_${successProvider}_${Date.now()}`,
        platform: successProvider,
        name,
        handle,
        avatar,
        followers,
        likes,
        totalViews,
        mediaCount,
        engagementRate: er,
        connectedAt: new Date().toISOString(),
        session,
        source: 'oauth',
        videos: []
      });

      const existingIdx = crmState.accounts.findIndex(
        a => a.platform === newAccount.platform && a.handle.toLowerCase() === newAccount.handle.toLowerCase()
      );
      if (existingIdx !== -1) {
        newAccount.id = crmState.accounts[existingIdx].id;
        crmState.accounts[existingIdx] = newAccount;
      } else {
        crmState.accounts.push(newAccount);
      }

      crmState.activeAccountId = newAccount.id;
      saveSpace();

      window.history.replaceState({}, document.title, window.location.pathname);

      showToast({
        type: 'success',
        title: '¡Autenticación OAuth 2.0 Exitosa!',
        message: `Sincronizando galería y métricas oficiales de ${name}...`,
        iconImg: getPlatformLogo(successProvider)
      });

      renderApp();
      setTimeout(() => syncLiveAccountVideos(false), 350);
      return;
    }

    if (unconfProvider) {
      const prov = unconfProvider === 'google' ? 'youtube' : unconfProvider;
      window.history.replaceState({}, document.title, window.location.pathname);
      showToast({
        type: 'warning',
        title: `Credenciales OAuth 2.0 Requeridas (${prov.toUpperCase()})`,
        message: 'Configura las variables CLIENT_ID y CLIENT_SECRET en tu Worker de Cloudflare para activar este proveedor oficial.',
        iconImg: getPlatformLogo(prov)
      });
      return;
    }

    if (errorProvider) {
      const msg = url.searchParams.get('msg') || 'Se canceló la ventana de autorización oficial.';
      window.history.replaceState({}, document.title, window.location.pathname);
      showToast({
        type: 'warning',
        title: 'Autorización OAuth Cancelada',
        message: msg,
        iconImg: getPlatformLogo(errorProvider)
      });
    }
  }

  async function syncLiveAccountVideos(silent = false) {
    const acc = getActiveAccount();
    if (!acc) return;

    const syncBtns = document.querySelectorAll('.sync-live-btn');
    syncBtns.forEach(btn => {
      btn.classList.add('opacity-60', 'pointer-events-none');
      const icon = btn.querySelector('.sync-icon');
      if (icon) icon.classList.add('animate-spin');
    });

    try {
      const cleanHandle = (acc.handle || '').replace(/^@/, '').trim();
      const res = await fetch(`${crmState.workerUrl}/api/connect/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: acc.platform,
          handle: cleanHandle,
          session: acc.session || ''
        })
      });

      if (!res.ok) throw new Error('Error al consultar el servidor Edge');
      const data = await res.json();

      if (data.ok && data.account) {
        const live = data.account;
        if (Array.isArray(live.videos) && live.videos.length > 0) {
          acc.videos = live.videos.map((v, i) => normalizeVideo(v, acc.platform, i)).filter(Boolean);
        }
        if (Number(live.followers) > 0) acc.followers = Number(live.followers);
        if (Number(live.likes) > 0) acc.likes = Number(live.likes);
        if (Number(live.totalViews) > 0) acc.totalViews = Number(live.totalViews);
        if (Number(live.mediaCount) > 0) acc.mediaCount = Number(live.mediaCount);
        if (live.avatar && live.avatar !== 'logo.png') acc.avatar = live.avatar;
        if (live.name && live.name !== cleanHandle) acc.name = live.name;
        if (live.bio) acc.bio = live.bio;
        if (live.engagementRate !== undefined && Number(live.engagementRate) > 0) {
          acc.engagementRate = Number(live.engagementRate);
        } else if (acc.videos.length > 0) {
          const sViews = acc.videos.reduce((s, v) => s + v.views, 0);
          const sInt = acc.videos.reduce((s, v) => s + v.likes + v.comments + v.shares, 0);
          if (sViews > 0) acc.engagementRate = Number(((sInt / sViews) * 100).toFixed(2));
        }
        acc.lastSyncAt = new Date().toISOString();

        saveSpace();
        renderApp();

        if (!silent) {
          showToast({
            type: 'success',
            title: 'Sincronización Oficial Completada',
            message: `${acc.handle}: ${acc.videos.length} publicaciones y métricas actualizadas en galería.`,
            iconImg: getPlatformLogo(acc.platform)
          });
        }
      }
    } catch (e) {
      console.warn('[Sync Live Error]:', e);
      if (!silent) {
        showToast({
          type: 'warning',
          title: 'Aviso de Sincronización',
          message: 'No se recibieron cambios nuevos desde el proveedor OAuth en este instante.'
        });
      }
    } finally {
      syncBtns.forEach(btn => {
        btn.classList.remove('opacity-60', 'pointer-events-none');
        const icon = btn.querySelector('.sync-icon');
        if (icon) icon.classList.remove('animate-spin');
      });
    }
  }

  // ==========================================================================
  // 14. CHATBOT NYX IA (LOGONYX.PNG SIN CUADRO + ANIMACIÓN DE ESCRITURA + GEMINI/GROQ)
  // ==========================================================================
  function setNyxAgentState(state) {
    const cores = document.querySelectorAll('.nyx-neural-agent');
    cores.forEach(core => {
      core.setAttribute('data-agent-state', state || 'idle');
    });
    const statusText = document.getElementById('nyxAgentStatusText');
    if (statusText) {
      const map = {
        idle: 'Gemini IA + Groq Cascade • Monitoreando métricas reales',
        listening: 'Empaquetando telemetría de tu panel...',
        thinking: 'Procesando en el Cerebro Edge (Gemini → Groq)...',
        speaking: 'Estrategia redactada en tiempo real'
      };
      statusText.textContent = map[state] || map.idle;
    }
  }

  function buildFullPanelContext() {
    const current = getActiveAccount();
    const calc = calculateDynamicRates();

    if (!current) {
      return {
        platform: 'none',
        name: 'Sin cuenta vinculada',
        handle: '@sin_cuenta',
        followers: 0,
        totalViews: 0,
        engagementRate: 0,
        mediaCount: 0,
        videos: [],
        studioSummary: {
          scheduledCount: (crmState.calendarItems || []).length,
          scriptsCount: (crmState.savedScripts || []).length,
          utmCount: (crmState.utmLinks || []).length,
          suggestedRateSingle: calc.singleVideoRate
        }
      };
    }

    const compactVideos = (current.videos || []).slice(0, 10).map(v => ({
      title: String(v.title || '').slice(0, 80),
      views: v.views || 0,
      likes: v.likes || 0,
      comments: v.comments || 0,
      shares: v.shares || 0,
      er: v.er || 0,
      publishedAt: (v.publishedAt || '').slice(0, 10)
    }));

    return {
      name: current.name,
      handle: current.handle,
      platform: current.platform,
      followers: current.followers,
      totalViews: current.totalViews,
      engagementRate: current.engagementRate,
      mediaCount: current.mediaCount,
      videos: compactVideos,
      studioSummary: {
        scheduledCount: (crmState.calendarItems || []).length,
        scriptsCount: (crmState.savedScripts || []).length,
        utmCount: (crmState.utmLinks || []).length,
        suggestedRateSingle: calc.singleVideoRate
      }
    };
  }

  function openAiDrawer() {
    const drawer = document.getElementById('aiChatDrawer');
    if (drawer) drawer.classList.remove('translate-x-full');
    setNyxAgentState('idle');
    renderAiContextInfo();
  }

  function closeAiDrawer() {
    const drawer = document.getElementById('aiChatDrawer');
    if (drawer) drawer.classList.add('translate-x-full');
  }

  function toggleAiDrawer(force) {
    const drawer = document.getElementById('aiChatDrawer');
    if (!drawer) return;
    const isClosed = drawer.classList.contains('translate-x-full');
    const shouldOpen = typeof force === 'boolean' ? force : isClosed;
    if (shouldOpen) openAiDrawer();
    else closeAiDrawer();
  }

  function sendQuickPrompt(promptText) {
    openAiDrawer();
    const input = document.getElementById('aiChatInput');
    if (input) {
      input.value = promptText || '';
      handleAiSubmit();
    }
  }

  function clearChatHistory() {
    crmState.chatHistory = [];
    saveSpace();
    const thread = document.getElementById('aiChatThread');
    if (thread) thread.innerHTML = '';
    appendChatMessage(
      'assistant',
      'Historial reiniciado. Soy **NYX**, conectado a **Google Gemini IA** y **Groq LPU**. Pregúntame sobre tu galería de videos, tarifas de patrocinio, enlaces UTM o guiones.',
      'NYX • Gemini + Groq',
      false
    );
  }

  async function handleAiSubmit(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('aiChatInput');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    input.value = '';

    appendChatMessage('user', userText, '', false);
    setNyxAgentState('thinking');

    const accountContext = buildFullPanelContext();
    const thread = document.getElementById('aiChatThread');
    const typingId = 'typing_' + Date.now();
    const typingEl = document.createElement('div');
    typingEl.id = typingId;
    typingEl.className = 'flex items-center gap-3.5 p-3.5 rounded-2xl border surface-card text-xs text-slate-500 animate-fade-in';
    typingEl.style.borderColor = 'var(--border-subtle)';
    typingEl.innerHTML = `
      <div class="nyx-floating-avatar-sm shrink-0">
        <img src="logonyx.png" class="w-7 h-7 object-contain nyx-logo-pulse" alt="NYX" />
      </div>
      <div class="space-y-1">
        <div class="font-extrabold text-indigo-500 text-[11px]">NYX consultando Gemini IA / Groq con tus métricas...</div>
        <div class="nyx-wave-bars"><span></span><span></span><span></span><span></span><span></span></div>
      </div>
    `;
    if (thread) {
      thread.appendChild(typingEl);
      thread.scrollTop = thread.scrollHeight;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 22000);

      const res = await fetch(`${crmState.workerUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userText.slice(0, 1400),
          accountContext,
          history: (crmState.chatHistory || []).slice(-4)
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (typingEl) typingEl.remove();

      const replyText = data.reply || data.text;
      if (data.ok && replyText) {
        setNyxAgentState('speaking');
        crmState.chatHistory.push({ role: 'user', text: userText.slice(0, 300) });
        crmState.chatHistory.push({ role: 'assistant', text: replyText.slice(0, 600) });
        saveSpace();
        appendChatMessage('assistant', replyText, data.model || 'NYX • Gemini IA', true);
        return;
      }
      throw new Error(data.error || 'Respuesta incompleta');
    } catch (e) {
      if (typingEl) typingEl.remove();
      setNyxAgentState('speaking');
      const acc = getActiveAccount();
      const vids = acc && Array.isArray(acc.videos) ? acc.videos : [];
      const topV = vids.length ? [...vids].sort((a, b) => (b.views || 0) - (a.views || 0))[0] : null;
      const calc = calculateDynamicRates();
      const fallbackReply = acc
        ? `### Diagnóstico Táctico NYX para **${acc.name}** (${acc.handle})\n\n` +
          `1. **Métricas Verificadas:** Cuentas con **${formatNumber(acc.followers)} seguidores**, **${formatNumber(acc.totalViews)} visualizaciones** y un ER de **${acc.engagementRate}%** en **${vids.length} publicaciones**.\n` +
          (topV ? `2. **Publicación Líder:** Tu video *"${topV.title}"* lidera con **${formatNumber(topV.views)} vistas** y **${topV.er}% ER**. Te recomiendo crear una Parte 2 usando la plantilla *Mito vs. Realidad* del Estudio.\n` : '') +
          `3. **Monetización Sugerida:** Según tu alcance actual, tu tarifa recomendada por 1 video dedicado es de **$${formatNumber(calc.singleVideoRate)} USD** (Pack de 3 videos: **$${formatNumber(calc.bundle3Rate)} USD**).`
        : `### Copiloto Neuronal NYX Activo\n\nConecta tu cuenta oficial de **TikTok**, **Instagram (Meta)** o **YouTube (Google)** mediante OAuth 2.0 para que pueda leer tus publicaciones reales, calcular tu tarifario dinámico y redactar guiones a medida.`;

      appendChatMessage('assistant', fallbackReply, 'NYX • Motor Local en Vivo', true);
    }
  }

  function animateTypewriterMessage(contentContainer, fullText, onFinish) {
    const thread = document.getElementById('aiChatThread');
    const words = String(fullText || '').split(' ');
    let idx = 0;
    const step = Math.max(2, Math.ceil(words.length / 42));

    contentContainer.innerHTML = `<span class="nyx-typewriter-text whitespace-pre-wrap"></span><span class="nyx-typing-cursor">▍</span>`;
    const spanEl = contentContainer.querySelector('.nyx-typewriter-text');

    const timer = setInterval(() => {
      idx = Math.min(words.length, idx + step);
      if (spanEl) spanEl.textContent = words.slice(0, idx).join(' ');
      if (thread) thread.scrollTop = thread.scrollHeight;

      if (idx >= words.length) {
        clearInterval(timer);
        if (window.marked && window.marked.parse) {
          contentContainer.innerHTML = window.marked.parse(fullText);
        } else {
          contentContainer.innerHTML = `<p class="whitespace-pre-wrap">${escapeHtml(fullText)}</p>`;
        }
        if (thread) thread.scrollTop = thread.scrollHeight;
        setNyxAgentState('idle');
        if (typeof onFinish === 'function') onFinish();
      }
    }, 28);
  }

  function appendChatMessage(role, text, modelBadge, animate = false) {
    const thread = document.getElementById('aiChatThread');
    if (!thread) return;

    const el = document.createElement('div');
    el.className = `flex flex-col ${role === 'user' ? 'items-end' : 'items-start'} my-2 animate-fade-in`;

    const badge = modelBadge
      ? `<span class="ml-2 text-[9px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500">${escapeHtml(modelBadge)}</span>`
      : '';

    if (role === 'user') {
      el.innerHTML = `
        <div class="p-3.5 rounded-2xl rounded-tr-xs text-xs max-w-[85%] bg-indigo-600 text-white font-medium shadow-xs leading-relaxed">
          ${escapeHtml(text)}
        </div>
      `;
      thread.appendChild(el);
      thread.scrollTop = thread.scrollHeight;
    } else {
      let formatted = text;
      if (!animate) {
        if (window.marked && window.marked.parse) {
          formatted = window.marked.parse(text);
        } else {
          formatted = `<p class="whitespace-pre-wrap">${escapeHtml(text)}</p>`;
        }
      }

      el.innerHTML = `
        <div class="flex items-start gap-3 max-w-[95%]">
          <div class="nyx-floating-avatar-sm shrink-0 mt-1">
            <img src="logonyx.png" class="w-7 h-7 object-contain nyx-logo-float" alt="NYX" onerror="this.src='logo.png'" />
          </div>
          <div class="p-3.5 rounded-2xl rounded-tl-xs border text-xs surface-card leading-relaxed space-y-1.5 shadow-xs flex-1" style="border-color: var(--border-subtle);">
            <div class="flex items-center justify-between text-[10.5px] font-extrabold text-indigo-600 dark:text-indigo-400">
              <span>Agente Neuronal NYX</span>
              ${badge}
            </div>
            <div class="nyx-message-body prose prose-sm dark:prose-invert max-w-none space-y-1.5 text-xs">${animate ? '' : formatted}</div>
          </div>
        </div>
      `;

      thread.appendChild(el);
      thread.scrollTop = thread.scrollHeight;

      if (animate) {
        const bodyContainer = el.querySelector('.nyx-message-body');
        if (bodyContainer) {
          animateTypewriterMessage(bodyContainer, text);
        }
      }
    }
  }

  function renderAiContextInfo() {
    const label = document.getElementById('aiDrawerContextLabel');
    const current = getActiveAccount();
    if (label) {
      label.textContent = current
        ? `Telemetría Activa: ${current.handle} • ${formatNumber(current.followers)} seg • ${(current.videos || []).length} videos`
        : 'Listo • Conecta una cuenta OAuth 2.0 para telemetría en vivo';
    }
  }

  // ==========================================================================
  // 15. GUÍA INTERACTIVA 0 A 100 (AUTO-APERTURA EN PRIMERA VISITA + ANIMACIONES)
  // ==========================================================================
  const TOTAL_GUIDE_STEPS = 6;

  function openInteractiveGuide(startStep = 0) {
    const modal = document.getElementById('interactiveGuideModal');
    if (!modal) return;
    setGuideStep(startStep);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeInteractiveGuide() {
    const modal = document.getElementById('interactiveGuideModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    try {
      localStorage.setItem(GUIDE_SEEN_KEY, '1');
    } catch (e) {}
  }

  function setGuideStep(stepIdx) {
    activeGuideStep = Math.max(0, Math.min(TOTAL_GUIDE_STEPS - 1, stepIdx));
    const percents = [15, 35, 55, 75, 90, 100];
    const pct = percents[activeGuideStep] || 100;

    document.querySelectorAll('.guide-step-pane').forEach((pane, idx) => {
      if (idx === activeGuideStep) pane.classList.remove('hidden');
      else pane.classList.add('hidden');
    });

    document.querySelectorAll('[data-guide-dot]').forEach((dot, idx) => {
      dot.className = idx === activeGuideStep
        ? 'w-7 h-2 rounded-full bg-indigo-500 transition-all cursor-pointer'
        : 'w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 transition-all cursor-pointer';
    });

    const counter = document.getElementById('guideStepCounter');
    if (counter) counter.textContent = `MÓDULO ${activeGuideStep + 1} DE ${TOTAL_GUIDE_STEPS}`;

    const pctBadge = document.getElementById('guidePercentBadge');
    if (pctBadge) pctBadge.textContent = `${pct}% DOMINADO`;

    const progBar = document.getElementById('guideProgressBar');
    if (progBar) progBar.style.width = `${pct}%`;

    const prevBtn = document.getElementById('guidePrevBtn');
    if (prevBtn) {
      if (activeGuideStep === 0) {
        prevBtn.classList.add('opacity-40', 'pointer-events-none');
      } else {
        prevBtn.classList.remove('opacity-40', 'pointer-events-none');
      }
    }

    const nextBtn = document.getElementById('guideNextBtn');
    if (nextBtn) {
      nextBtn.textContent = activeGuideStep === TOTAL_GUIDE_STEPS - 1 ? '¡Comenzar en My CRM Studio! →' : 'Siguiente Módulo →';
    }
  }

  function nextGuideStep() {
    if (activeGuideStep >= TOTAL_GUIDE_STEPS - 1) {
      closeInteractiveGuide();
      return;
    }
    setGuideStep(activeGuideStep + 1);
  }

  function prevGuideStep() {
    if (activeGuideStep <= 0) return;
    setGuideStep(activeGuideStep - 1);
  }

  // ==========================================================================
  // 16. UTILIDADES DE FORMATO Y INICIALIZACIÓN AUTOMÁTICA
  // ==========================================================================
  function formatNumber(num) {
    return new Intl.NumberFormat('es-AR').format(Number(num) || 0);
  }

  function formatCompactNumber(num) {
    const n = Number(num) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  function formatDuration(sec) {
    const s = Math.max(0, Math.round(Number(sec) || 0));
    if (!s) return '';
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  }

  function formatFriendlyDate(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return String(iso);
    }
  }

  function formatShortDate(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    } catch (e) {
      return '';
    }
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toggleMobileSidebar(force) {
    const sidebar = document.getElementById('leftSidebar');
    const backdrop = document.getElementById('mobileBackdrop');
    if (!sidebar) return;

    const isHidden = sidebar.classList.contains('-translate-x-full');
    const open = typeof force === 'boolean' ? force : isHidden;

    if (open) {
      sidebar.classList.remove('-translate-x-full');
      if (backdrop) backdrop.classList.remove('hidden');
    } else {
      sidebar.classList.add('-translate-x-full');
      if (backdrop) backdrop.classList.add('hidden');
    }
  }

  function bootApplication() {
    initTheme();
    loadSpace();
    checkUrlForAuthCallback();
    renderApp();
    switchView(crmState.activeView || 'dashboard');

    const thread = document.getElementById('aiChatThread');
    if (thread && thread.children.length === 0) {
      if (Array.isArray(crmState.chatHistory) && crmState.chatHistory.length > 0) {
        crmState.chatHistory.forEach(m => appendChatMessage(m.role, m.text, m.role === 'assistant' ? 'NYX • Gemini + Groq' : '', false));
      } else {
        appendChatMessage(
          'assistant',
          '¡Bienvenido a **My CRM Studio**! Soy **NYX**, tu agente neuronal impulsado por **Google Gemini IA** y **Groq**. Conecta tu cuenta oficial o pregúntame sobre tu galería de videos, tarifario de patrocinios o estructuras de guiones.',
          'NYX • Gemini + Groq',
          false
        );
      }
    }

    // Si el usuario entra por primera vez al panel, abrir automáticamente la Guía Interactiva 0 a 100
    try {
      const hasSeenGuide = localStorage.getItem(GUIDE_SEEN_KEY);
      if (!hasSeenGuide) {
        setTimeout(() => openInteractiveGuide(0), 450);
      }
    } catch (e) {}

    document.addEventListener('click', (e) => {
      const switcher = document.getElementById('accountSwitcherButton');
      const menu = document.getElementById('accountDropdownMenu');
      if (menu && !menu.classList.contains('hidden') && switcher && !switcher.contains(e.target) && !menu.contains(e.target)) {
        toggleAccountMenu(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openAiDrawer();
        setTimeout(() => document.getElementById('aiChatInput')?.focus(), 100);
      }
    });
  }

  // Exportar API pública completa a window
  window.selectActiveAccount = selectActiveAccount;
  window.removeAccount = removeAccount;
  window.toggleAccountMenu = toggleAccountMenu;
  window.switchView = switchView;
  window.toggleTheme = toggleTheme;
  window.toggleMobileSidebar = toggleMobileSidebar;
  window.connectGoogle = connectGoogle;
  window.connectInstagram = connectInstagram;
  window.connectTikTok = connectTikTok;
  window.searchCompetitor = searchCompetitor;
  window.openAiDrawer = openAiDrawer;
  window.closeAiDrawer = closeAiDrawer;
  window.toggleAiDrawer = toggleAiDrawer;
  window.sendQuickPrompt = sendQuickPrompt;
  window.clearChatHistory = clearChatHistory;
  window.handleAiSubmit = handleAiSubmit;
  window.showToast = showToast;
  window.showConfirmModal = showConfirmModal;
  window.executeConfirmModalAction = executeConfirmModalAction;
  window.closeConfirmModal = closeConfirmModal;
  window.syncLiveAccountVideos = syncLiveAccountVideos;
  window.handleImageFallback = handleImageFallback;
  window.updateCatalogFilter = updateCatalogFilter;
  window.analyzeVideoWithNyx = analyzeVideoWithNyx;
  window.exportCatalogCSV = exportCatalogCSV;
  window.setChartMetricMode = setChartMetricMode;
  window.setChartType = setChartType;
  window.setChartRange = setChartRange;
  window.addCalendarItem = addCalendarItem;
  window.cycleCalendarStatus = cycleCalendarStatus;
  window.deleteCalendarItem = deleteCalendarItem;
  window.updateStudioCalculator = updateStudioCalculator;
  window.copyMediaKitQuote = copyMediaKitQuote;
  window.applyScriptTemplate = applyScriptTemplate;
  window.saveScriptToVault = saveScriptToVault;
  window.copySavedScript = copySavedScript;
  window.deleteSavedScript = deleteSavedScript;
  window.applyUtmPreset = applyUtmPreset;
  window.updateUtmLivePreview = updateUtmLivePreview;
  window.generateUtmLink = generateUtmLink;
  window.deleteUtmLink = deleteUtmLink;
  window.toggleAuditCheck = toggleAuditCheck;
  window.toggleAuditChecklist = toggleAuditCheck;
  window.runDeepAiAudit = runDeepAiAudit;
  window.runLiveDeepAudit = runDeepAiAudit;
  window.openInteractiveGuide = openInteractiveGuide;
  window.closeInteractiveGuide = closeInteractiveGuide;
  window.setGuideStep = setGuideStep;
  window.goToGuideStep = setGuideStep;
  window.nextGuideStep = nextGuideStep;
  window.prevGuideStep = prevGuideStep;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootApplication);
  } else {
    bootApplication();
  }

})(window, document);


