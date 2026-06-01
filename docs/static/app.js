const API_BASE = window.location.origin;
const WS_URL = `ws://${window.location.hostname}:5001/`;

const MOVIMIENTOS = {
  adelante: 1,
  atras: 2,
  vuelta_adelante_derecha: 3,
  vuelta_adelante_izquierda: 4,
  vuelta_atras_derecha: 5,
  vuelta_atras_izquierda: 6,
  giro_90_izquierda: 8,
  giro_90_derecha: 7,
  giro_360_izquierda: 10,
  giro_360_derecha: 9,
  alto: 11
};

const MOVE_KEYS_BY_DB = {
  ADELANTE: 'adelante',
  ATRAS: 'atras',
  VUELTA_ADELANTE_DER: 'vuelta_adelante_derecha',
  VUELTA_ADELANTE_IZQ: 'vuelta_adelante_izquierda',
  VUELTA_ATRAS_DER: 'vuelta_atras_derecha',
  VUELTA_ATRAS_IZQ: 'vuelta_atras_izquierda',
  GIRO_90_IZQ: 'giro_90_izquierda',
  GIRO_90_DER: 'giro_90_derecha',
  GIRO_360_IZQ: 'giro_360_izquierda',
  GIRO_360_DER: 'giro_360_derecha',
  PARADA: 'alto'
};

const MOVEMENT_LABELS = {
  adelante: 'Adelante',
  atras: 'Atras',
  vuelta_adelante_derecha: 'Vuelta adelante derecha',
  vuelta_adelante_izquierda: 'Vuelta adelante izquierda',
  vuelta_atras_derecha: 'Vuelta atras derecha',
  vuelta_atras_izquierda: 'Vuelta atras izquierda',
  giro_90_izquierda: 'Giro 90 izquierda',
  giro_90_derecha: 'Giro 90 derecha',
  giro_360_izquierda: 'Giro 360 izquierda',
  giro_360_derecha: 'Giro 360 derecha',
  alto: 'Parada'
};

const state = {
  ws: null,
  reconnectTimer: null,
  controlMode: 'joystick',
  joystickActive: false,
  lastJoystickMove: null,
  dpadStopTimer: null,
  lastDistance: null,
  demoSequence: [],
  selectedDemoId: null
};

const apiStatus = document.querySelector('#apiStatus');
const wsStatus = document.querySelector('#wsStatus');
const lastMovement = document.querySelector('#lastMovement');
const distanceValue = document.querySelector('#distanceValue');
const lastEvent = document.querySelector('#lastEvent');
const lastUpdate = document.querySelector('#lastUpdate');
const logBox = document.querySelector('#log');
const paramsForm = document.querySelector('#paramsForm');
const joystickZone = document.querySelector('.joystick-zone');
const joystick = document.querySelector('#joystick');
const joystickKnob = document.querySelector('#joystickKnob');
const joystickControl = document.querySelector('#joystickControl');
const dpadControl = document.querySelector('#dpadControl');
const joystickSpinGrid = document.querySelector('#joystickSpinGrid');
const currentCommand = document.querySelector('#currentCommand');
const obstacleAlert = document.querySelector('#obstacleAlert');
const obstacleMessage = document.querySelector('#obstacleMessage');
const statusHistory = document.querySelector('#statusHistory');
const obstacleHistory = document.querySelector('#obstacleHistory');
const speedInput = document.querySelector('#speedInput');
const factorTimeInput = document.querySelector('#factorTimeInput');
const demoMoveSelect = document.querySelector('#demoMoveSelect');
const demoSequence = document.querySelector('#demoSequence');
const demosList = document.querySelector('#demosList');
const demoName = document.querySelector('#demoName');
const selectedDemoName = document.querySelector('#selectedDemoName');
const executeDemoButton = document.querySelector('#executeDemoButton');
const repeatDemoButton = document.querySelector('#repeatDemoButton');
const deleteDemoButton = document.querySelector('#deleteDemoButton');
const radar = document.querySelector('#radar');
const radarBlip = document.querySelector('#radarBlip');
const radarDistance = document.querySelector('#radarDistance');
const radarState = document.querySelector('#radarState');

function now() {
  return new Date().toLocaleTimeString();
}

function setPill(element, label, status) {
  if (!element) {
    return;
  }

  const dotClass = status === 'ok' ? 'dot-ok' : status === 'bad' ? 'dot-bad' : 'dot-warn';
  element.innerHTML = `<span class="dot ${dotClass}"></span>${label}`;
}

function log(message) {
  if (!logBox) {
    return;
  }

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<time>${now()}</time> ${message}`;
  logBox.prepend(entry);

  while (logBox.children.length > 60) {
    logBox.removeChild(logBox.lastChild);
  }
}

function touch() {
  if (lastUpdate) {
    lastUpdate.textContent = now();
  }
}

function formatDate(value) {
  if (!value) {
    return '--:--';
  }

  return new Date(value).toLocaleTimeString();
}

function cancelDpadStop() {
  if (!state.dpadStopTimer) {
    return;
  }

  clearTimeout(state.dpadStopTimer);
  state.dpadStopTimer = null;
}

function scheduleDpadStop() {
  const seconds = Math.max(0.1, Number(factorTimeInput?.value || 1));

  cancelDpadStop();

  state.dpadStopTimer = setTimeout(() => {
    state.dpadStopTimer = null;
    sendMovement('alto', { silent: true });
    log(`Cruceta detenida despues de ${seconds} segundo(s).`);
  }, seconds * 1000);
}

async function sendMovement(moveKey, options = {}) {
  const idMovimiento = MOVIMIENTOS[moveKey];

  if (!idMovimiento) {
    log(`Movimiento no configurado: ${moveKey}`);
    return false;
  }

  const payload = {
    id_dispositivo: 1,
    id_movimiento: idMovimiento,
    origen: options.origen || 'API',
    control_mode: options.controlMode || state.controlMode
  };

  try {
    const response = await fetch(`${API_BASE}/api/movimiento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    const label = MOVEMENT_LABELS[moveKey] || moveKey;
    setPill(apiStatus, 'API conectada', 'ok');
    if (lastMovement) {
      lastMovement.textContent = label;
    }

    if (!options.silent) {
      log(`Movimiento enviado: ${label}`);
    }

    touch();
    refreshStatus();
    requestLastMovement();
    return true;
  } catch (error) {
    setPill(apiStatus, 'API con error', 'bad');
    log(`Error enviando movimiento: ${error.message}`);
    return false;
  }
}

async function saveParams(event) {
  if (event) {
    event.preventDefault();
  }

  if (!paramsForm) {
    return;
  }

  const form = new FormData(paramsForm);
  const payload = {
    id_parametro: Number(form.get('id_parametro')),
    velocidad: Number(form.get('velocidad')),
    factor_vuelta: Number(form.get('factor_vuelta')),
    factor_tiempo: Number(form.get('factor_tiempo')),
    factor_giro90: Number(form.get('factor_giro90'))
  };

  try {
    const response = await fetch(`${API_BASE}/api/parametros`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    setPill(apiStatus, 'API conectada', 'ok');
    log(`Velocidad actualizada: ${payload.velocidad}`);
    window.localStorage.setItem('carritoFactorTiempo', String(payload.factor_tiempo));
    touch();
  } catch (error) {
    setPill(apiStatus, 'API con error', 'bad');
    log(`Error actualizando parametros: ${error.message}`);
  }
}

async function refreshStatus() {
  try {
    const response = await fetch(`${API_BASE}/api/estatus?limite=5`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    renderStatusHistory(data.data.movimientos || []);
    renderObstacleHistory(data.data.obstaculos || []);
  } catch (error) {
    log(`Error consultando estatus: ${error.message}`);
  }
}

function renderStatusHistory(items) {
  if (!statusHistory) {
    return;
  }

  if (!items.length) {
    statusHistory.innerHTML = '<div class="list-row"><span>Sin registros</span></div>';
    return;
  }

  statusHistory.innerHTML = items.map((item) => `
    <div class="list-row">
      <strong>${item.movimiento_clave}</strong>
      <span>${item.origen} · ${formatDate(item.fecha_hora)}</span>
    </div>
  `).join('');
}

function renderObstacleHistory(items) {
  if (!obstacleHistory) {
    return;
  }

  if (!items.length) {
    obstacleHistory.innerHTML = '<div class="list-row"><span>Sin obstaculos</span></div>';
    return;
  }

  obstacleHistory.innerHTML = items.map((item) => `
    <div class="list-row">
      <strong>${Number(item.distancia_cm).toFixed(1)} cm</strong>
      <span>${item.accion_tomada || 'Evento'} · ${formatDate(item.fecha_hora)}</span>
    </div>
  `).join('');
}

async function loadDemos() {
  if (!demosList) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/demos?limite=5`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    renderDemos(data.data || []);
  } catch (error) {
    log(`Error cargando demos: ${error.message}`);
  }
}

function renderDemos(items) {
  if (!demosList) {
    return;
  }

  if (!items.length) {
    demosList.innerHTML = '<div class="list-row"><span>Sin demos guardadas</span></div>';
    return;
  }

  demosList.innerHTML = items.map((item) => `
    <button class="list-row demo-row" data-demo-id="${item.id_demo}">
      <strong>${item.nombre}</strong>
      <span>${item.total_movimientos} movs</span>
    </button>
  `).join('');

  demosList.querySelectorAll('[data-demo-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedDemoId = Number(button.dataset.demoId);
      const name = button.querySelector('strong').textContent;

      demosList.querySelectorAll('[data-demo-id]').forEach((item) => {
        item.classList.toggle('active', item === button);
      });

      setSelectedDemo(name);
      log(`Demo seleccionado: ${name}`);
    });
  });
}

function setSelectedDemo(name = 'Ninguna') {
  if (!selectedDemoName) {
    return;
  }

  const selected = Boolean(state.selectedDemoId);

  selectedDemoName.textContent = name;
  executeDemoButton.disabled = !selected;
  repeatDemoButton.disabled = !selected;
  deleteDemoButton.disabled = !selected;
}

function renderDemoSequence() {
  if (!demoSequence) {
    return;
  }

  if (!state.demoSequence.length) {
    demoSequence.innerHTML = '<span class="text-muted small">Agrega movimientos para registrar un demo.</span>';
    return;
  }

  demoSequence.innerHTML = state.demoSequence.map((clave, index) => `
    <span class="sequence-chip">
      ${index + 1}. ${clave}
      <button data-remove-demo-index="${index}" title="Quitar">x</button>
    </span>
  `).join('');

  demoSequence.querySelectorAll('[data-remove-demo-index]').forEach((button) => {
    button.addEventListener('click', () => {
      state.demoSequence.splice(Number(button.dataset.removeDemoIndex), 1);
      renderDemoSequence();
    });
  });
}

async function saveDemo() {
  if (!state.demoSequence.length) {
    log('Agrega movimientos antes de registrar un demo.');
    return;
  }

  const payload = {
    nombre: demoName.value || 'Demo carrito',
    descripcion: 'Secuencia registrada desde la interfaz web',
    id_dispositivo: 1,
    movimientos: state.demoSequence
  };

  try {
    const response = await fetch(`${API_BASE}/api/demos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    const saved = data.data?.[0];
    state.selectedDemoId = saved?.id_demo || null;
    setSelectedDemo(payload.nombre);
    state.demoSequence = [];
    renderDemoSequence();
    loadDemos();
    log(`Demo registrado: ${payload.nombre}`);
  } catch (error) {
    log(`Error registrando demo: ${error.message}`);
  }
}

async function runSelectedDemo(action) {
  if (!state.selectedDemoId) {
    log('Selecciona o registra un demo primero.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/demos/${state.selectedDemoId}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id_dispositivo: 1 })
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    log(action === 'ejecutar' ? 'Demo enviado a ejecucion.' : 'Demo enviado a repeticion.');
    refreshStatus();
    requestLastMovement();
  } catch (error) {
    log(`Error procesando demo: ${error.message}`);
  }
}

async function deleteSelectedDemo() {
  if (!state.selectedDemoId) {
    log('Selecciona una demo primero.');
    return;
  }

  if (!window.confirm(`Eliminar demo "${selectedDemoName.textContent}"?`)) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/demos/${state.selectedDemoId}`, {
      method: 'DELETE'
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    log('Demo eliminada.');
    state.selectedDemoId = null;
    setSelectedDemo();
    loadDemos();
  } catch (error) {
    log(`Error eliminando demo: ${error.message}`);
  }
}

function connectWebSocket() {
  if (state.ws && [WebSocket.OPEN, WebSocket.CONNECTING].includes(state.ws.readyState)) {
    return;
  }

  setPill(wsStatus, 'WebSocket conectando', 'warn');

  state.ws = new WebSocket(WS_URL);

  state.ws.addEventListener('open', () => {
    setPill(wsStatus, 'WebSocket conectado', 'ok');
    log('WebSocket conectado');
    requestLastMovement();
  });

  state.ws.addEventListener('message', (event) => {
    handleWebSocketMessage(event.data);
  });

  state.ws.addEventListener('close', () => {
    setPill(wsStatus, 'WebSocket desconectado', 'bad');
    log('WebSocket desconectado, reintentando...');
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = setTimeout(connectWebSocket, 3000);
  });

  state.ws.addEventListener('error', () => {
    setPill(wsStatus, 'WebSocket con error', 'bad');
  });
}

function requestLastMovement() {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    return;
  }

  state.ws.send('get');
}

function handleWebSocketMessage(raw) {
  try {
    const data = JSON.parse(raw);

    if (Array.isArray(data)) {
      renderMovement(data);
      return;
    }

    if (data.evento === 'obstaculo') {
      renderObstacle(data);
      return;
    }

    if (data.evento === 'distancia') {
      renderDistance(data.distancia);
      return;
    }

    if (data.evento === 'autonomia') {
      renderAutonomy(data);
      return;
    }

    log(`Mensaje WebSocket: ${raw}`);
  } catch (error) {
    log(`Mensaje no JSON: ${raw}`);
  }
}

function renderMovement(data) {
  if (!data.length) {
    log('Sin movimiento pendiente');
    touch();
    return;
  }

  const movimiento = data[0];
  const clave = movimiento.movimiento_clave || 'Movimiento';
  const izquierda = `${movimiento.mi_direccion || 'STOP'} ${movimiento.mi_velocidad || 0}`;
  const derecha = `${movimiento.md_direccion || 'STOP'} ${movimiento.md_velocidad || 0}`;

  if (lastMovement) {
    lastMovement.textContent = clave;
  }
  log(`Ultimo movimiento: ${clave} | MI ${izquierda} | MD ${derecha}`);
  touch();
  refreshStatus();
}

function renderDistance(value) {
  const distancia = Number(value);

  if (!Number.isFinite(distancia) || distancia <= 0) {
    return;
  }

  const texto = `${distancia.toFixed(1)} cm`;
  const offset = Math.min(distancia, 100) * 0.7;
  const obstacle = distancia <= 15;

  state.lastDistance = distancia;

  if (distanceValue) {
    distanceValue.textContent = texto;
  }

  if (radarDistance) {
    radarDistance.textContent = texto;
  }

  if (radar) {
    radar.style.setProperty('--blip-offset', `${offset}%`);
    radar.classList.toggle('danger', obstacle);
  }

  if (radarBlip) {
    radarBlip.hidden = false;
  }

  if (radarState) {
    radarState.textContent = obstacle ? 'Obstaculo en zona de frenado' : 'Ruta frontal disponible';
  }

  touch();
}

async function renderObstacle(data) {
  const distancia = Number(data.distancia);
  const distanciaTexto = Number.isFinite(distancia) ? `${distancia.toFixed(1)} cm` : '-- cm';

  renderDistance(distancia);
  if (lastEvent) {
    lastEvent.textContent = 'Obstaculo';
  }

  if (obstacleMessage) {
    obstacleMessage.textContent = `Obstaculo a ${distanciaTexto}. El carro se detuvo y esta buscando una ruta libre automaticamente.`;
  }

  if (obstacleAlert) {
    obstacleAlert.hidden = false;
  }
  resetJoystick();

  log(`Obstaculo detectado a ${distanciaTexto}`);
  log('Frenado automatico activado por el sensor.');
  touch();
  refreshStatus();
}

function renderAutonomy(data) {
  const distancia = Number(data.distancia);
  const distanciaTexto = Number.isFinite(distancia) ? `${distancia.toFixed(1)} cm` : '-- cm';

  if (Number.isFinite(distancia)) {
    renderDistance(distancia);
  }

  if (data.estado === 'ruta_libre') {

    if (obstacleAlert) {
      obstacleAlert.hidden = true;
    }

    resetJoystick();

    if (lastEvent) {
      lastEvent.textContent = 'Ruta libre';
    }

    log(`Ruta libre encontrada: ${distanciaTexto}`);
    touch();
    return;
  }

  if (data.estado === 'sin_ruta') {
    if (lastEvent) {
      lastEvent.textContent = 'Sin ruta libre';
    }

    if (obstacleMessage) {
      obstacleMessage.textContent = `No se encontro una ruta libre despues de revisar las cuatro direcciones. Distancia actual: ${distanciaTexto}.`;
    }

    if (obstacleAlert) {
      obstacleAlert.hidden = false;
    }

    resetJoystick();
    log(`Busqueda autonoma detenida sin ruta libre. Distancia: ${distanciaTexto}`);
    touch();
    return;
  }

  if (lastEvent) {
    lastEvent.textContent = data.estado === 'girando' ? 'Giro autonomo 90 grados' : 'Buscando ruta libre';
  }

  if (obstacleMessage) {
    obstacleMessage.textContent = data.estado === 'girando'
      ? `Obstaculo a ${distanciaTexto}. El carrito esta girando 90 grados para revisar otra direccion.`
      : `Buscando una ruta libre. Distancia actual: ${distanciaTexto}.`;
  }

  if (obstacleAlert) {
    obstacleAlert.hidden = false;
  }
  resetJoystick();
  log(`${data.estado === 'girando' ? 'Giro autonomo' : 'Busqueda autonoma'}. Distancia: ${distanciaTexto}`);
  touch();
}

function resetJoystick() {
  state.joystickActive = false;
  state.lastJoystickMove = null;

  if (joystickKnob) {
    joystickKnob.style.transform = 'translate(-50%, -50%)';
  }

  if (currentCommand) {
    currentCommand.textContent = 'Reposo';
  }
}

function moveFromVector(x, y) {
  const deadZone = 0.28;
  const distance = Math.hypot(x, y);

  if (distance < deadZone) {
    return null;
  }

  const forward = y < -deadZone;
  const backward = y > deadZone;
  const left = x < -deadZone;
  const right = x > deadZone;

  if (forward && left) return 'vuelta_adelante_izquierda';
  if (forward && right) return 'vuelta_adelante_derecha';
  if (backward && left) return 'vuelta_atras_izquierda';
  if (backward && right) return 'vuelta_atras_derecha';
  if (forward) return 'adelante';
  if (backward) return 'atras';
  if (left) return 'vuelta_adelante_izquierda';
  if (right) return 'vuelta_adelante_derecha';

  return null;
}

function updateJoystick(clientX, clientY) {
  if (!joystick || !joystickKnob) {
    return;
  }

  const rect = joystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const radius = rect.width / 2;
  const knobLimit = radius - 33;

  let dx = clientX - centerX;
  let dy = clientY - centerY;
  const distance = Math.hypot(dx, dy);

  if (distance > knobLimit) {
    dx = (dx / distance) * knobLimit;
    dy = (dy / distance) * knobLimit;
  }

  joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

  const moveKey = moveFromVector(dx / knobLimit, dy / knobLimit);

  if (!moveKey) {
    if (currentCommand) {
      currentCommand.textContent = 'Reposo';
    }

    return;
  }

  if (currentCommand) {
    currentCommand.textContent = MOVEMENT_LABELS[moveKey];
  }

  if (moveKey !== state.lastJoystickMove) {
    state.lastJoystickMove = moveKey;
    sendMovement(moveKey);
  }
}

if (joystick) {
  joystick.addEventListener('pointerdown', (event) => {
    cancelDpadStop();

    state.joystickActive = true;
    joystick.setPointerCapture(event.pointerId);
    updateJoystick(event.clientX, event.clientY);
  });

  joystick.addEventListener('pointermove', (event) => {
    if (state.joystickActive) {
      updateJoystick(event.clientX, event.clientY);
    }
  });
}

function endJoystick() {
  if (!state.joystickActive) {
    return;
  }

  resetJoystick();
  sendMovement('alto');
}

if (joystick) {
  joystick.addEventListener('pointerup', endJoystick);
  joystick.addEventListener('pointercancel', endJoystick);
  joystick.addEventListener('lostpointercapture', endJoystick);
}

document.querySelectorAll('[data-move]').forEach((button) => {
  button.addEventListener('click', () => {
    const moveKey = button.dataset.move;

    if (moveKey === 'alto') {
      cancelDpadStop();
    }

    if (currentCommand) {
      currentCommand.textContent = MOVEMENT_LABELS[moveKey] || moveKey;
    }

    sendMovement(moveKey).then((sent) => {
      if (sent && moveKey !== 'alto' && button.closest('#dpadControl')) {
        scheduleDpadStop();
      }
    });
  });
});

document.querySelectorAll('[data-control-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    state.controlMode = button.dataset.controlMode;
    resetJoystick();

    document.querySelectorAll('[data-control-mode]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
    });

    joystickControl.hidden = state.controlMode !== 'joystick';
    dpadControl.hidden = state.controlMode !== 'dpad';
    joystickSpinGrid.hidden = state.controlMode !== 'joystick';
    log(`Modo de control: ${state.controlMode === 'joystick' ? 'joystick' : 'cruceta'}`);
  });
});

document.querySelectorAll('[data-speed]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-speed]').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    speedInput.value = button.dataset.speed;
    saveParams();
  });
});

document.querySelector('#stopButton')?.addEventListener('click', () => {
  cancelDpadStop();
  sendMovement('alto', { force: true });
  resetJoystick();
});

document.querySelector('#refreshButton')?.addEventListener('click', () => {
  requestLastMovement();
  refreshStatus();
  log('Consulta manual de estatus');
});

document.querySelector('#clearLogButton')?.addEventListener('click', () => {
  logBox.innerHTML = '';
});

document.querySelector('#addDemoMoveButton')?.addEventListener('click', () => {
  state.demoSequence.push(demoMoveSelect.value);
  renderDemoSequence();
});
document.querySelector('#saveDemoButton')?.addEventListener('click', saveDemo);
executeDemoButton?.addEventListener('click', () => runSelectedDemo('ejecutar'));
repeatDemoButton?.addEventListener('click', () => runSelectedDemo('repetir'));
deleteDemoButton?.addEventListener('click', deleteSelectedDemo);

paramsForm?.addEventListener('submit', saveParams);

setPill(apiStatus, 'API lista', 'warn');

if (factorTimeInput) {
  factorTimeInput.value = window.localStorage.getItem('carritoFactorTiempo') || factorTimeInput.value;
}

renderDemoSequence();
connectWebSocket();
refreshStatus();
loadDemos();
setInterval(requestLastMovement, 5000);
setInterval(refreshStatus, 7000);

if (window.location.hostname.endsWith('github.io')) {
  setPill(apiStatus, 'Vista publica', 'warn');
  setPill(wsStatus, 'Backend local requerido', 'warn');
}
