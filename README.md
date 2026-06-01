# Carrito IoT con ESP8266

Aplicacion web local para controlar y monitorear un carrito IoT basado en ESP8266. El sistema permite ejecutar 11 movimientos, ajustar la velocidad, registrar y repetir secuencias DEMO, consultar los ultimos eventos y visualizar la distancia frontal medida por un sensor ultrasonico HC-SR04.

El proyecto utiliza Flask, MySQL, Stored Procedures y WebSockets. La interfaz publica puede mostrarse mediante GitHub Pages, mientras que el control real del carrito requiere ejecutar el backend dentro de la misma red local que el ESP8266.

## Funcionalidades

- Control mediante joystick y cruceta.
- Panel con 11 movimientos de direccion.
- Cuatro niveles de velocidad y parametros configurables.
- Registro, ejecucion, repeticion y eliminacion de secuencias DEMO.
- Sensor HC-SR04 con telemetria de distancia en tiempo real.
- Frenado automatico cuando se detecta un obstaculo a 15 cm o menos.
- Busqueda autonoma de una ruta libre mediante giros de 90 grados.
- Registro de movimientos y obstaculos en MySQL mediante Stored Procedures.
- Pagina independiente de monitoreo con los ultimos cinco estatus.
- Interfaz construida con Bootstrap, favicon y vista publica para GitHub Pages.

## Arquitectura

```text
Pagina web
   | REST: http://127.0.0.1:5000
   | WebSocket: ws://<IP_LOCAL_PC>:5001
   v
Backend Flask + servidor WebSocket
   |
   +--> MySQL local + Stored Procedures
   |
   +--> ESP8266 + motores + HC-SR04
```

## Tecnologias

| Componente | Tecnologia |
|---|---|
| Firmware | Arduino C++ para ESP8266 |
| Backend | Python con Flask |
| Tiempo real | WebSocket |
| Base de datos | MySQL |
| Frontend | HTML, CSS, JavaScript y Bootstrap 5 |
| Vista publica | GitHub Pages mediante `docs/` |

## Estructura del Proyecto

```text
arduino/carrito_iot.ino       Firmware del ESP8266
config/database.py            Conexion local a MySQL
controllers/                  Controladores REST
models/                       Acceso a datos y Stored Procedures
templates/index.html          Pagina de control
templates/monitoreo.html      Pagina de monitoreo
static/                       CSS, JavaScript y favicon
websocket/websocket_server.py Servidor WebSocket
docs/                         Copia estatica para GitHub Pages
sync-pages.ps1                Sincronizacion de la vista publica
app.py                        Punto de entrada de Flask
```

## Conexiones del ESP8266

| Componente | Pin |
|---|---|
| Motor `IN_1` | GPIO14 |
| Motor `IN_2` | GPIO4 |
| Motor `IN_3` | GPIO13 |
| Motor `IN_4` | GPIO12 |
| HC-SR04 `TRIG` | GPIO5 |
| HC-SR04 `ECHO` | GPIO16 |

> Importante: verifica el voltaje permitido por el pin `ECHO` del ESP8266 y utiliza la proteccion electrica correspondiente para tu montaje.

## Movimientos Disponibles

| ID | Movimiento |
|---|---|
| 1 | Adelante |
| 2 | Atras |
| 3 | Vuelta adelante derecha |
| 4 | Vuelta adelante izquierda |
| 5 | Vuelta atras derecha |
| 6 | Vuelta atras izquierda |
| 7 | Giro 90 izquierda |
| 8 | Giro 90 derecha |
| 9 | Giro 360 izquierda |
| 10 | Giro 360 derecha |
| 11 | Parada |

## Preparacion Local

### 1. Configurar MySQL

La conexion local se define en `config/database.py`:

```python
host="127.0.0.1"
user="root"
password="1234"
database="iot_cars"
port=3306
```

La base de datos debe contener las tablas y Stored Procedures requeridos por el proyecto.

### 2. Instalar Dependencias

```powershell
pip install -r requirements.txt
```

### 3. Verificar la IP Local

```powershell
ipconfig
```

Busca la direccion IPv4 de la red Wi-Fi utilizada por la computadora y el carrito. Actualiza esta linea en `arduino/carrito_iot.ino` cuando cambie la red:

```cpp
const char* websocket_host = "10.205.63.78";
```

### 4. Cargar el Firmware

Abre `arduino/carrito_iot.ino` en Arduino IDE, selecciona tu placa ESP8266 y carga el programa.

Para diagnosticar el sensor y la conexion, abre el monitor serial a `115200` baudios. Algunos mensajes esperados son:

```text
WIFI conectado
WebSocket conectado
Telemetria enviada: 24.70 cm
```

Si el sensor no responde:

```text
Sensor HC-SR04 sin lectura valida
```

### 5. Ejecutar el Backend

```powershell
python app.py
```

Deja la terminal abierta durante la demostracion.

### 6. Abrir las Paginas

- Control local: [http://127.0.0.1:5000/](http://127.0.0.1:5000/)
- Monitoreo local: [http://127.0.0.1:5000/monitoreo](http://127.0.0.1:5000/monitoreo)

## APIs REST

Base URL local:

```text
http://127.0.0.1:5000
```

### Registrar Movimiento

```http
POST /api/movimiento
Content-Type: application/json
```

```json
{
  "id_dispositivo": 1,
  "id_movimiento": 1,
  "origen": "API",
  "control_mode": "joystick"
}
```

### Actualizar Parametros

```http
PUT /api/parametros
Content-Type: application/json
```

```json
{
  "id_parametro": 1,
  "velocidad": 220,
  "factor_vuelta": 1,
  "factor_tiempo": 2,
  "factor_giro90": 1
}
```

`factor_tiempo` representa segundos. Por ejemplo, un valor de `2` hace que una pulsacion de cruceta mantenga el movimiento durante dos segundos.

### Consultar Ultimos Estatus

```http
GET /api/estatus?limite=5
```

### Listar Demos

```http
GET /api/demos?limite=5
```

### Registrar Demo

```http
POST /api/demos
Content-Type: application/json
```

```json
{
  "nombre": "Demo carrito",
  "descripcion": "Secuencia de prueba",
  "id_dispositivo": 1,
  "movimientos": [
    "ADELANTE",
    "GIRO_90_DER",
    "ATRAS",
    "PARADA"
  ]
}
```

### Consultar Demo

```http
GET /api/demos/{id_demo}
```

### Ejecutar Demo

```http
POST /api/demos/{id_demo}/ejecutar
Content-Type: application/json
```

```json
{
  "id_dispositivo": 1
}
```

### Repetir Demo

```http
POST /api/demos/{id_demo}/repetir
Content-Type: application/json
```

### Eliminar Demo

```http
DELETE /api/demos/{id_demo}
```

## WebSocket

El servidor WebSocket se ejecuta en:

```text
ws://<IP_LOCAL_PC>:5001/
```

Ejemplo dentro de la red utilizada durante el desarrollo:

```text
ws://10.205.63.78:5001/
```

### Telemetria de Distancia

Mensaje enviado por el ESP8266:

```json
{
  "tipo": "distancia",
  "distancia": 24.7
}
```

Mensaje retransmitido a la pagina:

```json
{
  "evento": "distancia",
  "distancia": 24.7
}
```

### Obstaculo Detectado

```json
{
  "tipo": "obstaculo",
  "distancia": 11.7
}
```

### Evasion Autonoma

```json
{
  "tipo": "autonomia",
  "estado": "girando",
  "distancia": 11.7
}
```

| Estado | Descripcion |
|---|---|
| `buscando` | Busca una direccion libre |
| `girando` | Ejecuta un giro autonomo de 90 grados |
| `ruta_libre` | Detecto una ruta disponible |
| `sin_ruta` | No encontro una salida libre |

## Stored Procedures Utilizados

| Stored Procedure | Uso |
|---|---|
| `sp_agregar_movimiento` | Registra una orden de movimiento |
| `sp_ultimo_movimiento` | Obtiene la ultima orden para el ESP8266 |
| `sp_actualizar_parametros` | Actualiza velocidad y factores |
| `sp_recalcular_motores` | Recalcula PWM y duraciones |
| `sp_agregar_obstaculo` | Registra una deteccion del HC-SR04 |
| `sp_ultimos_10_movimientos` | Consulta el historial reciente |
| `sp_ultimos_10_obstaculos` | Consulta obstaculos recientes |
| `sp_crear_demo` | Registra una secuencia DEMO |
| `sp_visualizar_demo` | Consulta los pasos de una DEMO |
| `sp_ultimas_demos` | Lista DEMOS recientes |

## GitHub Pages

La carpeta `docs/` contiene la vista estatica publica. Para regenerarla despues de modificar la interfaz:

```powershell
powershell -ExecutionPolicy Bypass -File .\sync-pages.ps1
```

Despues publica los cambios:

```powershell
git add .
git commit -m "Actualizar interfaz y documentacion"
git push
```

GitHub Pages sirve como vista publica del proyecto. El control fisico requiere que Flask, MySQL y el WebSocket se ejecuten localmente dentro de la red del carrito.

## Solucion de Problemas

### Error `WinError 10048`

Ya existe otra instancia de `app.py` utilizando el puerto WebSocket `5001`. Deten la terminal anterior con `Ctrl + C` antes de ejecutar nuevamente:

```powershell
python app.py
```

### La Pagina Muestra `API con error`

Verifica que MySQL este activo y que la configuracion de `config/database.py` sea correcta.

### El Radar No Muestra Distancia

Revisa el monitor serial. Si aparece `Sensor HC-SR04 sin lectura valida`, valida cableado, alimentacion y proteccion del pin `ECHO`.

### El Carrito No Se Conecta al WebSocket

Comprueba que:

1. La computadora y el ESP8266 esten conectados a la misma red.
2. La IP de `websocket_host` sea la IPv4 actual de la computadora.
3. `python app.py` se encuentre activo.
4. El firewall permita conexiones entrantes al puerto `5001`.
