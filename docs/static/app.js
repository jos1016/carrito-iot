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
  obstacleLocked: false,
  joystickActive: false,
  lastJoystickMove: null,
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
const currentCommand = document.querySelector('#currentCommand');
const obstacleAlert = document.querySelector('#obstacleAlert');
const obstacleMessage = document.querySelector('#obstacleMessage');
const statusHistory = document.querySelector('#statusHistory');
const obstacleHistory = document.querySelector('#obstacleHistory');
const speedInput = document.querySelector('#speedInput');
const demoMoveSelect = document.querySelector('#demoMoveSelect');
const demoSequence = document.querySelector('#demoSequence');
const demosList = document.querySelector('#demosList');
const demoName = document.querySelector('#demoName');
const repeatDemoButton = document.querySelector('#repeatDemoButton');

function now() {
  return new Date().toLocaleTimeString();
}

function setPill(element, label, status) {
  const dotClass = status === 'ok' ? 'dot-ok' : status === 'bad' ? 'dot-bad' : 'dot-warn';
  element.innerHTML = `<span class="dot ${dotClass}"></span>${label}`;
}

function log(message) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<time>${now()}</time> ${message}`;
  logBox.prepend(entry);

  while (logBox.children.length > 60) {
    logBox.removeChild(logBox.lastChild);
  }
}

function touch() {
  lastUpdate.textContent = now();
}

function formatDate(value) {
  if (!value) {
    return '--:--';
  }

  return new Date(value).toLocaleTimeString();
}

function setControlsLocked(locked) {
  state.obstacleLocked = locked;
  joystickZone.classList.toggle('locked', locked);

  document.querySelectorAll('[data-move]').forEach((button) => {
    button.disabled = locked;
  });

  currentCommand.textContent = locked ? 'Bloqueado por obstaculo' : 'Reposo';
}

async function sendMovement(moveKey, options = {}) {
  const idMovimiento = MOVIMIENTOS[moveKey];

  if (!idMovimiento) {
    log(`Movimiento no configurado: ${moveKey}`);
    return false;
  }

  if (state.obstacleLocked && moveKey !== 'alto' && !options.force) {
    log('Joystick bloqueado por obstaculo. Recalibra la ruta para continuar.');
    return false;
  }

  const payload = {
    id_dispositivo: 1,
    id_movimiento: idMovimiento,
    origen: options.origen || 'API'
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
    lastMovement.textContent = label;

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
      repeatDemoButton.disabled = false;
      log(`Demo seleccionado: ${button.querySelector('strong').textContent}`);
    });
  });
}

function renderDemoSequence() {
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
    repeatDemoButton.disabled = !state.selectedDemoId;
    state.demoSequence = [];
    renderDemoSequence();
    loadDemos();
    log(`Demo registrado: ${payload.nombre}`);
  } catch (error) {
    log(`Error registrando demo: ${error.message}`);
  }
}

async function repeatSelectedDemo() {
  if (!state.selectedDemoId) {
    log('Selecciona o registra un demo primero.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/demos/${state.selectedDemoId}/repetir`, {
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

    log('Demo enviado a repeticion.');
    refreshStatus();
    requestLastMovement();
  } catch (error) {
    log(`Error repitiendo demo: ${error.message}`);
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

    if (data.evento === 'recalibracion') {
      renderRecalibration(data);
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

  lastMovement.textContent = clave;
  log(`Ultimo movimiento: ${clave} | MI ${izquierda} | MD ${derecha}`);
  touch();
  refreshStatus();
}

async function renderObstacle(data) {
  const distancia = Number(data.distancia);
  const distanciaTexto = Number.isFinite(distancia) ? `${distancia.toFixed(1)} cm` : '-- cm';

  distanceValue.textContent = distanciaTexto;
  lastEvent.textContent = 'Obstaculo';
  obstacleMessage.textContent = `Obstaculo a ${distanciaTexto}. El carro fue detenido y el joystick queda bloqueado hasta recalibrar la ruta.`;
  obstacleAlert.hidden = false;
  setControlsLocked(true);
  resetJoystick();

  log(`Obstaculo detectado a ${distanciaTexto}`);
  log('Frenado automatico enviado: PARADA');
  touch();

  await sendMovement('alto', {
    force: true,
    silent: true
  });
  refreshStatus();
}

function renderRecalibration(data) {
  const distancia = Number(data.distancia);
  const distanciaTexto = Number.isFinite(distancia) ? `${distancia.toFixed(1)} cm` : '-- cm';

  if (data.estado === 'libre') {
    distanceValue.textContent = distanciaTexto;
    obstacleAlert.hidden = true;
    setControlsLocked(false);
    resetJoystick();
    lastEvent.textContent = 'Ruta libre';
    log(`Ruta libre despues de recalibrar: ${distanciaTexto}`);
    touch();
    return;
  }

  lastEvent.textContent = 'Recalibracion incompleta';
  obstacleMessage.textContent = `No se encontro ruta libre. Distancia actual: ${distanciaTexto}. Intenta recalibrar otra vez.`;
  obstacleAlert.hidden = false;
  setControlsLocked(true);
  resetJoystick();
  log(`Recalibracion incompleta. Distancia: ${distanciaTexto}`);
  touch();
}

async function recalibrateRoute() {
  obstacleAlert.hidden = false;
  obstacleMessage.textContent = 'Buscando ruta libre. El carrito retrocedera y girara automaticamente.';
  lastEvent.textContent = 'Recalibrando ruta';
  resetJoystick();
  setControlsLocked(true);
  log('Recalibrando ruta: busqueda autonoma iniciada.');
  touch();

  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({
      tipo: 'recalibrar',
      duracion_ms: 1000
    }));
    log('Orden directa enviada por WebSocket.');
  }

  try {
    const response = await fetch(`${API_BASE}/api/recalibrar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        duracion_ms: 1000
      })
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    log('Orden de recalibracion enviada al carrito.');
  } catch (error) {
    log(`Error enviando recalibracion: ${error.message}`);
  }
}

function resetJoystick() {
  state.joystickActive = false;
  state.lastJoystickMove = null;
  joystickKnob.style.transform = 'translate(-50%, -50%)';

  if (!state.obstacleLocked) {
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
  if (state.obstacleLocked) {
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
    currentCommand.textContent = 'Reposo';
    return;
  }

  currentCommand.textContent = MOVEMENT_LABELS[moveKey];

  if (moveKey !== state.lastJoystickMove) {
    state.lastJoystickMove = moveKey;
    sendMovement(moveKey);
  }
}

joystick.addEventListener('pointerdown', (event) => {
  if (state.obstacleLocked) {
    log('Joystick bloqueado. Recalibra la ruta para continuar.');
    return;
  }

  state.joystickActive = true;
  joystick.setPointerCapture(event.pointerId);
  updateJoystick(event.clientX, event.clientY);
});

joystick.addEventListener('pointermove', (event) => {
  if (state.joystickActive) {
    updateJoystick(event.clientX, event.clientY);
  }
});

function endJoystick() {
  if (!state.joystickActive) {
    return;
  }

  resetJoystick();
  sendMovement('alto');
}

joystick.addEventListener('pointerup', endJoystick);
joystick.addEventListener('pointercancel', endJoystick);
joystick.addEventListener('lostpointercapture', endJoystick);

document.querySelectorAll('[data-move]').forEach((button) => {
  button.addEventListener('click', () => {
    sendMovement(button.dataset.move);
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

document.querySelector('#stopButton').addEventListener('click', () => {
  sendMovement('alto', { force: true });
  resetJoystick();
});

document.querySelector('#refreshButton').addEventListener('click', () => {
  requestLastMovement();
  refreshStatus();
  log('Consulta manual de estatus');
});

document.querySelector('#clearLogButton').addEventListener('click', () => {
  logBox.innerHTML = '';
});

document.querySelector('#recalibrateButton').addEventListener('click', recalibrateRoute);
document.querySelector('#addDemoMoveButton').addEventListener('click', () => {
  state.demoSequence.push(demoMoveSelect.value);
  renderDemoSequence();
});
document.querySelector('#saveDemoButton').addEventListener('click', saveDemo);
repeatDemoButton.addEventListener('click', repeatSelectedDemo);

paramsForm.addEventListener('submit', saveParams);

setPill(apiStatus, 'API lista', 'warn');
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
