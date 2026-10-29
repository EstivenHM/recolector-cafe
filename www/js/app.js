/**
 * RECOLECTOR CAFÉ - APLICACIÓN PWA VANILLA JAVASCRIPT
 * Control de Cajuelas de Café, Pagos en Colones (₡) y Almacenamiento Offline
 */

(function () {
  'use strict';

  // =========================================================================
  // CONSTANTES Y CONFIGURACIÓN INICIAL
  // =========================================================================
  const STORAGE_KEYS = {
    USUARIOS: 'recolector_cafe_usuarios',
    AJUSTES: 'recolector_cafe_ajustes',
    LAST_SUNDAY_RESET: 'recolector_cafe_last_sunday_reset'
  };

  const DEFAULT_SETTINGS = {
    precioCajuela: 2000
  };

  // Datos de ejemplo iniciales (si no hay datos previos) para experiencia inmediata
  const DEFAULT_USUARIOS = [
    { id: 'rec_1', nombre: 'Juan', cajuelasSemana: 18.25, cajuelasHistorico: 35.50 },
    { id: 'rec_2', nombre: 'María', cajuelasSemana: 12.00, cajuelasHistorico: 28.00 },
    { id: 'rec_3', nombre: 'Carlos', cajuelasSemana: 6.50, cajuelasHistorico: 15.75 }
  ];

  // =========================================================================
  // ESTADO GLOBAL DE LA APLICACIÓN
  // =========================================================================
  let state = {
    usuarios: [],
    ajustes: { ...DEFAULT_SETTINGS },
    currentView: 'vista-usuarios',
    selectedUserForCajuelas: null,
    selectedUserForEdit: null,
    searchFilter: ''
  };

  // Referencias al DOM
  const dom = {
    // Vistas y navegación
    views: document.querySelectorAll('.view-panel'),
    navItems: document.querySelectorAll('.nav-item'),
    headerTitle: document.getElementById('header-title'),
    drawer: document.getElementById('app-drawer'),
    drawerOverlay: document.getElementById('drawer-overlay'),
    btnMenuToggle: document.getElementById('btn-menu-toggle'),
    btnCloseDrawer: document.getElementById('btn-close-drawer'),
    drawerUsersCount: document.getElementById('drawer-users-count'),
    drawerCurrentPrice: document.getElementById('drawer-current-price'),

    // Vista Usuarios
    tbodyUsuarios: document.getElementById('tbody-usuarios'),
    usuariosEmptyState: document.getElementById('usuarios-empty-state'),
    kpiTotalCajuelas: document.getElementById('kpi-total-cajuelas'),
    kpiTotalMonto: document.getElementById('kpi-total-monto'),
    inputBuscarUsuario: document.getElementById('input-buscar-usuario'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    btnManualReset: document.getElementById('btn-manual-reset'),
    txtCorteInfo: document.getElementById('txt-corte-info'),

    // Vista Crear Usuario
    formCrearUsuario: document.getElementById('form-crear-usuario'),
    inputNombreUsuario: document.getElementById('input-nombre-usuario'),
    btnGuardarUsuario: document.getElementById('btn-guardar-usuario'),
    listaGestionUsuarios: document.getElementById('lista-gestion-usuarios'),
    countExistentes: document.getElementById('count-existentes'),

    // Vista Historial
    tbodyHistorial: document.getElementById('tbody-historial'),
    historialEmptyState: document.getElementById('historial-empty-state'),
    kpiHistCajuelas: document.getElementById('kpi-hist-cajuelas'),
    kpiHistMonto: document.getElementById('kpi-hist-monto'),
    btnLimpiarHistorial: document.getElementById('btn-limpiar-historial'),

    // Vista Ajustes
    formAjustes: document.getElementById('form-ajustes'),
    inputPrecioCajuela: document.getElementById('input-precio-cajuela'),
    btnGuardarAjustes: document.getElementById('btn-guardar-ajustes'),
    btnCancelarAjustes: document.getElementById('btn-cancelar-ajustes'),

    // Modal Añadir Cajuelas
    modalCajuelas: document.getElementById('modal-cajuelas'),
    modalCajuelasRecolector: document.getElementById('modal-cajuelas-recolector'),
    modalCajuelasActuales: document.getElementById('modal-cajuelas-actuales'),
    inputCajuelasCantidad: document.getElementById('input-cajuelas-cantidad'),
    previewColones: document.getElementById('preview-colones'),
    btnCloseModalCajuelas: document.getElementById('btn-close-modal-cajuelas'),
    btnCancelarCajuelas: document.getElementById('btn-cancelar-cajuelas'),
    btnConfirmarCajuelas: document.getElementById('btn-confirmar-cajuelas'),
    quickButtons: document.querySelectorAll('.btn-quick'),

    // Modal Editar Usuario
    modalEditarUsuario: document.getElementById('modal-editar-usuario'),
    inputEditarNombre: document.getElementById('input-editar-nombre'),
    btnCloseModalEditar: document.getElementById('btn-close-modal-editar'),
    btnCancelarEditar: document.getElementById('btn-cancelar-editar'),
    btnConfirmarEditar: document.getElementById('btn-confirmar-editar'),

    // Modal Confirmación
    modalConfirm: document.getElementById('modal-confirm'),
    modalConfirmTitle: document.getElementById('modal-confirm-title'),
    modalConfirmMessage: document.getElementById('modal-confirm-message'),
    btnConfirmCancel: document.getElementById('btn-confirm-cancel'),
    btnConfirmAccept: document.getElementById('btn-confirm-accept'),

    // Toasts
    toastContainer: document.getElementById('toast-container'),
    onlineIndicator: document.getElementById('online-indicator')
  };

  // =========================================================================
  // UTILIDADES MATEMÁTICAS, VALIDACIONES Y FORMATOS
  // =========================================================================

  /**
   * Normaliza comas y puntos decimales, parsea y valida con isFinite y > 0
   * @param {string|number} rawValue 
   * @returns {number|null} Número flotante positivo redondeado a 2 decimales o null si es inválido
   */
  function parseValidNumber(rawValue) {
    if (rawValue === undefined || rawValue === null) return null;
    let strVal = String(rawValue).trim().replace(',', '.');
    if (strVal === '') return null;
    const num = parseFloat(strVal);
    if (!Number.isFinite(num) || num <= 0) return null;
    // Redondeo seguro a 2 decimales
    return Math.round(num * 100) / 100;
  }

  /**
   * Formatea un número de colones al estándar con ₡ y separador de miles con coma (ej: ₡36,500)
   * Garantiza que nunca devuelva NaN, undefined o null
   */
  function formatColones(amount) {
    if (amount === undefined || amount === null || !Number.isFinite(amount)) {
      return '₡0';
    }
    const val = Math.round(amount);
    // Formato con separadores de miles con coma para consistencia garantizada en cualquier dispositivo
    const formatted = val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return '₡' + formatted;
  }

  /**
   * Formatea el número de cajuelas de forma limpia sin ceros innecesarios
   */
  function formatCajuelas(cajuelas) {
    if (cajuelas === undefined || cajuelas === null || !Number.isFinite(cajuelas)) {
      return '0';
    }
    const rounded = Math.round(cajuelas * 100) / 100;
    // Si tiene decimales los muestra, si es entero no añade .00 innecesario
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);
  }

  /**
   * Escapa caracteres HTML para prevenir inyecciones XSS
   */
  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Retorna el timestamp del Domingo a las 00:00:00 de la semana actual
   */
  function getCurrentWeekSundayTimestamp(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay(); // 0 es Domingo
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  // =========================================================================
  // SISTEMA DE NOTIFICACIONES TOAST
  // =========================================================================
  function showToast(message, type = 'info') {
    if (!dom.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg viewBox="0 0 24 24" class="svg-icon" style="width:20px;height:20px"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="currentColor"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg viewBox="0 0 24 24" class="svg-icon" style="width:20px;height:20px"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/></svg>';
    } else if (type === 'warning') {
      iconSvg = '<svg viewBox="0 0 24 24" class="svg-icon" style="width:20px;height:20px"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/></svg>';
    } else {
      iconSvg = '<svg viewBox="0 0 24 24" class="svg-icon" style="width:20px;height:20px"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/></svg>';
    }

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
    dom.toastContainer.appendChild(toast);

    // Auto-remover a los 3.2 segundos
    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 250);
    }, 3200);
  }

  // =========================================================================
  // ALMACENAMIENTO LOCAL (localStorage)
  // =========================================================================
  function loadData() {
    try {
      const storedUsers = localStorage.getItem(STORAGE_KEYS.USUARIOS);
      if (storedUsers) {
        const parsed = JSON.parse(storedUsers);
        if (Array.isArray(parsed)) {
          state.usuarios = parsed.map(u => ({
            id: String(u.id || ('rec_' + Math.random().toString(36).substr(2, 9))),
            nombre: String(u.nombre || 'Sin nombre').trim(),
            cajuelasSemana: Number.isFinite(u.cajuelasSemana) ? Math.max(0, u.cajuelasSemana) : 0,
            cajuelasHistorico: Number.isFinite(u.cajuelasHistorico) ? Math.max(0, u.cajuelasHistorico) : 0
          }));
        } else {
          state.usuarios = [...DEFAULT_USUARIOS];
        }
      } else {
        state.usuarios = [...DEFAULT_USUARIOS];
        saveData();
      }

      const storedSettings = localStorage.getItem(STORAGE_KEYS.AJUSTES);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        if (parsedSettings && Number.isFinite(parsedSettings.precioCajuela) && parsedSettings.precioCajuela > 0) {
          state.ajustes.precioCajuela = parsedSettings.precioCajuela;
        }
      }
    } catch (e) {
      console.error('Error al cargar datos de localStorage:', e);
      state.usuarios = [...DEFAULT_USUARIOS];
      state.ajustes = { ...DEFAULT_SETTINGS };
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(state.usuarios));
      localStorage.setItem(STORAGE_KEYS.AJUSTES, JSON.stringify(state.ajustes));
    } catch (e) {
      console.error('Error al guardar datos en localStorage:', e);
      showToast('No se pudieron guardar los datos localmente', 'error');
    }
  }

  // =========================================================================
  // CORTE SEMANAL AUTOMÁTICO DE LOS DOMINGOS
  // =========================================================================
  function checkWeeklySundayReset() {
    try {
      const currentSunday = getCurrentWeekSundayTimestamp();
      const lastResetStr = localStorage.getItem(STORAGE_KEYS.LAST_SUNDAY_RESET);

      if (!lastResetStr) {
        // Primera ejecución: marcamos el domingo de la semana actual
        localStorage.setItem(STORAGE_KEYS.LAST_SUNDAY_RESET, String(currentSunday));
        return;
      }

      const lastReset = parseInt(lastResetStr, 10);
      if (Number.isFinite(lastReset) && currentSunday > lastReset) {
        // Ha pasado al menos un domingo nuevo sin haberse reiniciado
        let huboReinicio = false;
        state.usuarios.forEach(user => {
          if (user.cajuelasSemana > 0) {
            user.cajuelasSemana = 0;
            huboReinicio = true;
          }
        });

        localStorage.setItem(STORAGE_KEYS.LAST_SUNDAY_RESET, String(currentSunday));
        saveData();

        if (huboReinicio) {
          showToast('¡Corte semanal del domingo aplicado! Cajuelas de la semana reiniciadas a 0.', 'info');
        }
      }
    } catch (e) {
      console.error('Error en verificación de corte semanal:', e);
    }
  }

  function manualWeeklyReset() {
    openConfirmModal(
      '¿Deseas reiniciar las cajuelas de esta semana a 0 para todos los recolectores?<br><br><small style="color:var(--text-secondary)">Nota: Los datos acumulados en el <strong>Historial</strong> no se borrarán.</small>',
      'Reiniciar Semana',
      () => {
        state.usuarios.forEach(user => {
          user.cajuelasSemana = 0;
        });
        const currentSunday = getCurrentWeekSundayTimestamp();
        localStorage.setItem(STORAGE_KEYS.LAST_SUNDAY_RESET, String(currentSunday));
        saveData();
        renderAll();
        showToast('Semana reiniciada correctamente. Cajuelas semanales en 0.', 'success');
      }
    );
  }

  // =========================================================================
  // NAVEGACIÓN ENTRE VISTAS
  // =========================================================================
  const VIEW_TITLES = {
    'vista-usuarios': 'Usuarios',
    'vista-crear-usuario': 'Crear Usuario',
    'vista-historial': 'Historial',
    'vista-ajustes': 'Ajustes'
  };

  function navigateTo(viewId) {
    if (!VIEW_TITLES[viewId]) return;

    state.currentView = viewId;

    // Cambiar paneles visibles
    dom.views.forEach(panel => {
      panel.classList.toggle('active', panel.id === viewId);
    });

    // Actualizar nav items
    dom.navItems.forEach(item => {
      const target = item.getAttribute('data-view');
      item.classList.toggle('active', target === viewId);
    });

    // Actualizar título del header
    if (dom.headerTitle) {
      dom.headerTitle.textContent = VIEW_TITLES[viewId];
    }

    // Cerrar drawer
    closeDrawer();

    // Renderizar según vista activa
    if (viewId === 'vista-usuarios') {
      renderUsuarios();
    } else if (viewId === 'vista-crear-usuario') {
      renderGestionUsuarios();
      if (dom.inputNombreUsuario) {
        setTimeout(() => dom.inputNombreUsuario.focus(), 150);
      }
    } else if (viewId === 'vista-historial') {
      renderHistorial();
    } else if (viewId === 'vista-ajustes') {
      renderAjustes();
    }
  }

  function openDrawer() {
    dom.drawer.classList.add('open');
    dom.drawerOverlay.classList.add('open');
  }

  function closeDrawer() {
    dom.drawer.classList.remove('open');
    dom.drawerOverlay.classList.remove('open');
  }

  // =========================================================================
  // RENDERIZADO DE VISTAS
  // =========================================================================

  /**
   * Renderiza la tabla y los KPIs de la vista Usuarios
   */
  function renderUsuarios() {
    if (!dom.tbodyUsuarios) return;

    const precio = state.ajustes.precioCajuela;
    const filterText = state.searchFilter.trim().toLowerCase();

    // Filtrar usuarios si hay búsqueda
    const filteredUsers = state.usuarios.filter(u => {
      if (!filterText) return true;
      return u.nombre.toLowerCase().includes(filterText);
    });

    // Calcular totales semanales
    let totalCajuelas = 0;
    state.usuarios.forEach(u => {
      totalCajuelas += Number.isFinite(u.cajuelasSemana) ? u.cajuelasSemana : 0;
    });
    totalCajuelas = Math.round(totalCajuelas * 100) / 100;
    const totalMonto = totalCajuelas * precio;

    if (dom.kpiTotalCajuelas) dom.kpiTotalCajuelas.textContent = formatCajuelas(totalCajuelas);
    if (dom.kpiTotalMonto) dom.kpiTotalMonto.textContent = formatColones(totalMonto);
    if (dom.drawerUsersCount) dom.drawerUsersCount.textContent = state.usuarios.length.toString();
    if (dom.drawerCurrentPrice) dom.drawerCurrentPrice.textContent = formatColones(precio);

    // Renderizar tabla
    dom.tbodyUsuarios.innerHTML = '';

    if (filteredUsers.length === 0) {
      dom.usuariosEmptyState.style.display = 'flex';
      return;
    } else {
      dom.usuariosEmptyState.style.display = 'none';
    }

    filteredUsers.forEach(user => {
      const tr = document.createElement('tr');
      const cajuelas = Number.isFinite(user.cajuelasSemana) ? user.cajuelasSemana : 0;
      const monto = cajuelas * precio;

      tr.innerHTML = `
        <td class="td-nombre">${escapeHtml(user.nombre)}</td>
        <td class="td-num">${formatCajuelas(cajuelas)}</td>
        <td class="td-monto">${formatColones(monto)}</td>
        <td class="td-accion">
          <button class="btn-action-add" data-id="${escapeHtml(user.id)}" aria-label="Añadir cajuelas a ${escapeHtml(user.nombre)}" title="Añadir Cajuelas">
            +
          </button>
        </td>
      `;
      dom.tbodyUsuarios.appendChild(tr);
    });
  }

  /**
   * Renderiza la lista de recolectores registrados con opciones de Editar y Eliminar
   */
  function renderGestionUsuarios() {
    if (!dom.listaGestionUsuarios) return;
    dom.listaGestionUsuarios.innerHTML = '';
    if (dom.countExistentes) dom.countExistentes.textContent = state.usuarios.length.toString();

    if (state.usuarios.length === 0) {
      dom.listaGestionUsuarios.innerHTML = '<div class="users-empty-hint">Aún no hay recolectores registrados. Agrega uno arriba.</div>';
      return;
    }

    state.usuarios.forEach(user => {
      const item = document.createElement('div');
      item.className = 'user-manage-item';

      const initial = (user.nombre || '?').trim().charAt(0).toUpperCase();
      const semanaCaj = Number.isFinite(user.cajuelasSemana) ? user.cajuelasSemana : 0;
      const histCaj = Number.isFinite(user.cajuelasHistorico) ? user.cajuelasHistorico : 0;

      item.innerHTML = `
        <div class="user-item-info">
          <div class="user-avatar-badge">${escapeHtml(initial)}</div>
          <div class="user-name-group">
            <span class="user-item-name">${escapeHtml(user.nombre)}</span>
            <span class="user-item-meta">Semana: ${formatCajuelas(semanaCaj)} caj. | Historial: ${formatCajuelas(histCaj)} caj.</span>
          </div>
        </div>
        <div class="user-actions">
          <button type="button" class="btn-icon-action btn-edit-user" data-id="${escapeHtml(user.id)}" title="Editar nombre" aria-label="Editar ${escapeHtml(user.nombre)}">
            <svg viewBox="0 0 24 24" class="svg-icon" style="width:18px;height:18px">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
            </svg>
          </button>
          <button type="button" class="btn-icon-action btn-delete-user" data-id="${escapeHtml(user.id)}" title="Eliminar recolector" aria-label="Eliminar ${escapeHtml(user.nombre)}">
            <svg viewBox="0 0 24 24" class="svg-icon" style="width:18px;height:18px">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      `;
      dom.listaGestionUsuarios.appendChild(item);
    });
  }

  /**
   * Renderiza la tabla y KPIs de la vista Historial
   */
  function renderHistorial() {
    if (!dom.tbodyHistorial) return;

    const precio = state.ajustes.precioCajuela;
    let totalHistCajuelas = 0;

    state.usuarios.forEach(u => {
      totalHistCajuelas += Number.isFinite(u.cajuelasHistorico) ? u.cajuelasHistorico : 0;
    });
    totalHistCajuelas = Math.round(totalHistCajuelas * 100) / 100;
    const totalHistMonto = totalHistCajuelas * precio;

    if (dom.kpiHistCajuelas) dom.kpiHistCajuelas.textContent = formatCajuelas(totalHistCajuelas);
    if (dom.kpiHistMonto) dom.kpiHistMonto.textContent = formatColones(totalHistMonto);

    dom.tbodyHistorial.innerHTML = '';

    if (state.usuarios.length === 0) {
      dom.historialEmptyState.style.display = 'flex';
      return;
    } else {
      dom.historialEmptyState.style.display = 'none';
    }

    state.usuarios.forEach(user => {
      const tr = document.createElement('tr');
      const histCajuelas = Number.isFinite(user.cajuelasHistorico) ? user.cajuelasHistorico : 0;
      const histMonto = histCajuelas * precio;

      tr.innerHTML = `
        <td class="td-nombre">${escapeHtml(user.nombre)}</td>
        <td class="td-num">${formatCajuelas(histCajuelas)}</td>
        <td class="td-monto">${formatColones(histMonto)}</td>
      `;
      dom.tbodyHistorial.appendChild(tr);
    });
  }

  /**
   * Renderiza el formulario de Ajustes
   */
  function renderAjustes() {
    if (dom.inputPrecioCajuela) {
      dom.inputPrecioCajuela.value = state.ajustes.precioCajuela.toString();
    }
  }

  function renderAll() {
    renderUsuarios();
    renderGestionUsuarios();
    renderHistorial();
    renderAjustes();
  }

  // =========================================================================
  // GESTIÓN DE ACCIONES (CREAR, AÑADIR, LIMPIAR)
  // =========================================================================

  /**
   * Crear un nuevo recolector
   */
  function handleCrearUsuario() {
    if (!dom.inputNombreUsuario) return;
    const rawNombre = dom.inputNombreUsuario.value.trim();

    if (!rawNombre) {
      showToast('Por favor escribe el nombre del recolector.', 'error');
      dom.inputNombreUsuario.focus();
      return;
    }

    // Validación de nombres duplicados (insensible a mayúsculas/minúsculas)
    const normalizedNew = rawNombre.toLowerCase();
    const yaExiste = state.usuarios.some(u => u.nombre.trim().toLowerCase() === normalizedNew);

    if (yaExiste) {
      showToast(`Ya existe un recolector llamado "${rawNombre}".`, 'error');
      dom.inputNombreUsuario.focus();
      return;
    }

    // Crear y añadir nuevo usuario
    const nuevoUsuario = {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      nombre: rawNombre,
      cajuelasSemana: 0,
      cajuelasHistorico: 0
    };

    state.usuarios.push(nuevoUsuario);
    saveData();
    renderAll();

    dom.inputNombreUsuario.value = '';
    showToast(`Recolector "${rawNombre}" guardado con éxito.`, 'success');
  }

  /**
   * Modal y Gestión de Edición de Usuario
   */
  function openModalEditar(userId) {
    const user = state.usuarios.find(u => u.id === userId);
    if (!user) return;
    state.selectedUserForEdit = user;
    if (dom.inputEditarNombre) {
      dom.inputEditarNombre.value = user.nombre;
    }
    if (dom.modalEditarUsuario) {
      dom.modalEditarUsuario.classList.add('open');
      setTimeout(() => dom.inputEditarNombre.focus(), 150);
    }
  }

  function closeModalEditar() {
    if (dom.modalEditarUsuario) {
      dom.modalEditarUsuario.classList.remove('open');
    }
    state.selectedUserForEdit = null;
  }

  function handleConfirmarEditarUsuario() {
    if (!state.selectedUserForEdit || !dom.inputEditarNombre) return;
    const nuevoNombre = dom.inputEditarNombre.value.trim();

    if (!nuevoNombre) {
      showToast('Por favor escribe un nombre válido para el recolector.', 'error');
      dom.inputEditarNombre.focus();
      return;
    }

    const normalizado = nuevoNombre.toLowerCase();
    const yaExisteOtro = state.usuarios.some(u => 
      u.id !== state.selectedUserForEdit.id && u.nombre.trim().toLowerCase() === normalizado
    );

    if (yaExisteOtro) {
      showToast(`Ya existe otro recolector llamado "${nuevoNombre}".`, 'error');
      dom.inputEditarNombre.focus();
      return;
    }

    const nombreAnterior = state.selectedUserForEdit.nombre;
    state.selectedUserForEdit.nombre = nuevoNombre;
    saveData();
    renderAll();
    closeModalEditar();

    if (nombreAnterior !== nuevoNombre) {
      showToast(`Recolector modificado: "${nombreAnterior}" ➔ "${nuevoNombre}".`, 'success');
    }
  }

  /**
   * Eliminación de Usuario con Confirmación
   */
  function handleEliminarUsuario(userId) {
    const user = state.usuarios.find(u => u.id === userId);
    if (!user) return;

    const semanaCaj = Number.isFinite(user.cajuelasSemana) ? user.cajuelasSemana : 0;
    const histCaj = Number.isFinite(user.cajuelasHistorico) ? user.cajuelasHistorico : 0;

    openConfirmModal(
      `¿Estás seguro de que deseas eliminar al recolector <strong>${escapeHtml(user.nombre)}</strong>?<br><br><span style="color:#EF4444">¡Atención! Se eliminarán de forma definitiva sus datos: <strong>${formatCajuelas(semanaCaj)}</strong> cajuelas de la semana y <strong>${formatCajuelas(histCaj)}</strong> cajuelas acumuladas en el historial.</span>`,
      'Eliminar',
      () => {
        state.usuarios = state.usuarios.filter(u => u.id !== userId);
        saveData();
        renderAll();
        showToast(`Recolector "${user.nombre}" eliminado correctamente.`, 'info');
      }
    );
  }

  /**
   * Modal de Añadir Cajuelas
   */
  function openModalCajuelas(userId) {
    const user = state.usuarios.find(u => u.id === userId);
    if (!user) return;

    state.selectedUserForCajuelas = user;

    if (dom.modalCajuelasRecolector) {
      dom.modalCajuelasRecolector.textContent = `Añadir Cajuelas a ${user.nombre}`;
    }
    if (dom.modalCajuelasActuales) {
      dom.modalCajuelasActuales.textContent = formatCajuelas(user.cajuelasSemana);
    }
    if (dom.inputCajuelasCantidad) {
      dom.inputCajuelasCantidad.value = '';
    }
    if (dom.previewColones) {
      dom.previewColones.textContent = '₡0';
    }

    dom.modalCajuelas.classList.add('open');
    setTimeout(() => {
      if (dom.inputCajuelasCantidad) dom.inputCajuelasCantidad.focus();
    }, 150);
  }

  function closeModalCajuelas() {
    dom.modalCajuelas.classList.remove('open');
    state.selectedUserForCajuelas = null;
  }

  function updateCajuelasColonesPreview() {
    if (!dom.inputCajuelasCantidad || !dom.previewColones) return;
    const parsed = parseValidNumber(dom.inputCajuelasCantidad.value);
    if (parsed === null) {
      dom.previewColones.textContent = '₡0';
      return;
    }
    const montoPreview = parsed * state.ajustes.precioCajuela;
    dom.previewColones.textContent = formatColones(montoPreview);
  }

  function handleConfirmarCajuelas() {
    if (!state.selectedUserForCajuelas) return;

    const rawInput = dom.inputCajuelasCantidad.value;
    const cantidad = parseValidNumber(rawInput);

    if (cantidad === null) {
      showToast('Ingresa una cantidad de cajuelas válida mayor a 0 (ej: 18.25 o 0.5).', 'error');
      dom.inputCajuelasCantidad.focus();
      return;
    }

    const user = state.selectedUserForCajuelas;
    const semanaPrevia = Number.isFinite(user.cajuelasSemana) ? user.cajuelasSemana : 0;
    const histPrevio = Number.isFinite(user.cajuelasHistorico) ? user.cajuelasHistorico : 0;

    // Sumar tanto a la semana como al acumulado histórico
    user.cajuelasSemana = Math.round((semanaPrevia + cantidad) * 100) / 100;
    user.cajuelasHistorico = Math.round((histPrevio + cantidad) * 100) / 100;

    saveData();
    renderAll();
    closeModalCajuelas();

    showToast(`Se sumaron ${formatCajuelas(cantidad)} cajuelas a ${user.nombre}.`, 'success');
  }

  /**
   * Guardar / Cancelar Ajustes de Precio
   */
  function handleGuardarAjustes() {
    if (!dom.inputPrecioCajuela) return;
    const nuevoPrecio = parseValidNumber(dom.inputPrecioCajuela.value);

    if (nuevoPrecio === null || nuevoPrecio <= 0) {
      showToast('Por favor ingresa un precio por cajuela válido y mayor a 0.', 'error');
      dom.inputPrecioCajuela.focus();
      return;
    }

    state.ajustes.precioCajuela = Math.round(nuevoPrecio);
    saveData();
    renderAll();
    showToast(`Precio actualizado a ${formatColones(state.ajustes.precioCajuela)} por cajuela.`, 'success');
  }

  function handleCancelarAjustes() {
    if (dom.inputPrecioCajuela) {
      dom.inputPrecioCajuela.value = state.ajustes.precioCajuela.toString();
    }
    showToast('Cambios de ajustes cancelados.', 'info');
  }

  /**
   * Limpiar Historial Acumulado
   */
  function handleLimpiarHistorial() {
    openConfirmModal(
      '¿Estás seguro de que deseas poner en <strong>0</strong> el historial acumulado de todos los recolectores?<br><br><span style="color:#EF4444">¡Esta acción es irreversible!</span>',
      'Limpiar Historial',
      () => {
        state.usuarios.forEach(u => {
          u.cajuelasHistorico = 0;
        });
        saveData();
        renderAll();
        showToast('Historial acumulado reiniciado a 0.', 'success');
      }
    );
  }

  // =========================================================================
  // MODAL GENÉRICO DE CONFIRMACIÓN
  // =========================================================================
  let confirmCallback = null;

  function openConfirmModal(messageHtml, confirmBtnText = 'Confirmar', onAccept) {
    if (!dom.modalConfirm) return;

    dom.modalConfirmMessage.innerHTML = messageHtml;
    dom.btnConfirmAccept.textContent = confirmBtnText;
    confirmCallback = onAccept;

    dom.modalConfirm.classList.add('open');
  }

  function closeConfirmModal() {
    if (dom.modalConfirm) {
      dom.modalConfirm.classList.remove('open');
    }
    confirmCallback = null;
  }

  // =========================================================================
  // REGISTRO DE EVENTOS (LISTENERS)
  // =========================================================================
  function setupEventListeners() {
    // Menú Lateral
    dom.btnMenuToggle.addEventListener('click', openDrawer);
    dom.btnCloseDrawer.addEventListener('click', closeDrawer);
    dom.drawerOverlay.addEventListener('click', closeDrawer);

    // Navegación en Drawer
    dom.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetView = item.getAttribute('data-view');
        if (targetView) navigateTo(targetView);
      });
    });

    // Delegación de clic en tabla Usuarios para botón Acción [+]
    dom.tbodyUsuarios.addEventListener('click', (e) => {
      const btnAdd = e.target.closest('.btn-action-add');
      if (btnAdd) {
        const userId = btnAdd.getAttribute('data-id');
        if (userId) openModalCajuelas(userId);
      }
    });

    // Búsqueda en Vista Usuarios
    dom.inputBuscarUsuario.addEventListener('input', (e) => {
      state.searchFilter = e.target.value;
      dom.btnClearSearch.style.display = state.searchFilter ? 'block' : 'none';
      renderUsuarios();
    });

    dom.btnClearSearch.addEventListener('click', () => {
      dom.inputBuscarUsuario.value = '';
      state.searchFilter = '';
      dom.btnClearSearch.style.display = 'none';
      renderUsuarios();
      dom.inputBuscarUsuario.focus();
    });

    // Botón manual de Reiniciar Semana
    dom.btnManualReset.addEventListener('click', manualWeeklyReset);

    // Crear Usuario
    dom.formCrearUsuario.addEventListener('submit', (e) => {
      e.preventDefault();
      handleCrearUsuario();
    });

    // Gestión de usuarios (Editar y Eliminar desde Crear Usuario)
    if (dom.listaGestionUsuarios) {
      dom.listaGestionUsuarios.addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-edit-user');
        if (btnEdit) {
          const userId = btnEdit.getAttribute('data-id');
          if (userId) openModalEditar(userId);
          return;
        }

        const btnDelete = e.target.closest('.btn-delete-user');
        if (btnDelete) {
          const userId = btnDelete.getAttribute('data-id');
          if (userId) handleEliminarUsuario(userId);
          return;
        }
      });
    }

    // Modal Editar Usuario
    if (dom.btnCloseModalEditar) dom.btnCloseModalEditar.addEventListener('click', closeModalEditar);
    if (dom.btnCancelarEditar) dom.btnCancelarEditar.addEventListener('click', closeModalEditar);
    if (dom.btnConfirmarEditar) dom.btnConfirmarEditar.addEventListener('click', handleConfirmarEditarUsuario);

    if (dom.inputEditarNombre) {
      dom.inputEditarNombre.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleConfirmarEditarUsuario();
        }
      });
    }

    // Modal Añadir Cajuelas
    dom.btnCloseModalCajuelas.addEventListener('click', closeModalCajuelas);
    dom.btnCancelarCajuelas.addEventListener('click', closeModalCajuelas);
    dom.btnConfirmarCajuelas.addEventListener('click', handleConfirmarCajuelas);

    // Entrada en tiempo real de cajuelas
    dom.inputCajuelasCantidad.addEventListener('input', updateCajuelasColonesPreview);
    dom.inputCajuelasCantidad.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmarCajuelas();
      }
    });

    // Botones rápidos de añadir cajuelas
    dom.quickButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseFloat(btn.getAttribute('data-add') || '0');
        const current = parseValidNumber(dom.inputCajuelasCantidad.value) || 0;
        const nuevoTotal = Math.round((current + val) * 100) / 100;
        dom.inputCajuelasCantidad.value = nuevoTotal.toString();
        updateCajuelasColonesPreview();
      });
    });

    // Historial
    dom.btnLimpiarHistorial.addEventListener('click', handleLimpiarHistorial);

    // Ajustes
    dom.formAjustes.addEventListener('submit', (e) => {
      e.preventDefault();
      handleGuardarAjustes();
    });
    dom.btnCancelarAjustes.addEventListener('click', handleCancelarAjustes);

    // Modal Confirmación
    dom.btnConfirmCancel.addEventListener('click', closeConfirmModal);
    dom.btnConfirmAccept.addEventListener('click', () => {
      if (typeof confirmCallback === 'function') {
        confirmCallback();
      }
      closeConfirmModal();
    });

    // Tecla Escape para cerrar modales o drawer
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModalCajuelas();
        closeModalEditar();
        closeConfirmModal();
        closeDrawer();
      }
    });

    // Eventos de estado de red
    function updateOnlineStatus() {
      if (!dom.onlineIndicator) return;
      if (navigator.onLine) {
        dom.onlineIndicator.innerHTML = '<span class="badge-dot" style="background:#4CAF50;box-shadow:0 0 6px #4CAF50"></span><span class="badge-text">Offline OK</span>';
      } else {
        dom.onlineIndicator.innerHTML = '<span class="badge-dot" style="background:#F59E0B;box-shadow:0 0 6px #F59E0B"></span><span class="badge-text" style="color:#FCD34D">100% Offline</span>';
      }
    }
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // Verificación de corte semanal al regresar a la app
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkWeeklySundayReset();
      }
    });
  }

  // =========================================================================
  // REGISTRO DE SERVICE WORKER PARA PWA OFFLINE
  // =========================================================================
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
          .then((reg) => {
            console.log('Service Worker registrado correctamente en el scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('Fallo en el registro del Service Worker:', err);
          });
      });
    }
  }

  // =========================================================================
  // INICIALIZACIÓN DE LA APLICACIÓN
  // =========================================================================
  function init() {
    loadData();
    checkWeeklySundayReset();
    setupEventListeners();
    renderAll();
    registerServiceWorker();

    // Exportar objeto app en ventana para botones inline si fuera necesario
    window.app = {
      navigateTo,
      showToast
    };
  }

  // Iniciar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
