#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

#define IN_2 4
#define IN_1 14
#define IN_4 12
#define IN_3 13

#define TRIG_PIN 5
#define ECHO_PIN 16

const char* ssid = "JoshSH";
const char* password = "bichongo";

const char* websocket_host = "10.205.63.78";
const int websocket_port = 5001;

WebSocketsClient webSocket;

String ultimaFecha = "";

bool websocketConectado = false;
bool modoAutonomo = false;

unsigned long ultimoIntentoWiFi = 0;
unsigned long ultimoEnvioObstaculo = 0;
unsigned long ultimoEnvioDistancia = 0;

const float DISTANCIA_OBSTACULO_CM = 15.0;
const unsigned long TIEMPO_ENTRE_OBSTACULOS = 3000;
const unsigned long INTERVALO_ENVIO_DISTANCIA = 300;
const unsigned long TIEMPO_GIRO_90_MS = 550;
const int MAX_GIROS_BUSQUEDA = 4;

void conectarWiFi();
void verificarWiFi();
void detenerMotores();
void procesarMovimiento(String json);
void moverCarro(int inputIA, int inputIB, int inputDA, int inputDB, int tiempo);
void webSocketEvent(WStype_t type, uint8_t* payload, size_t length);
float medirDistancia();
bool verificarObstaculo();
void enviarDistancia(float distancia);
void registrarObstaculo(float distancia);
void reportarAutonomia(String estado, float distancia);
void girarDerecha90();
void buscarRutaLibre(float distanciaInicial);

void setup()
{
  Serial.begin(115200);

  pinMode(IN_1, OUTPUT);
  pinMode(IN_2, OUTPUT);
  pinMode(IN_3, OUTPUT);
  pinMode(IN_4, OUTPUT);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  digitalWrite(TRIG_PIN, LOW);
  detenerMotores();
  conectarWiFi();

  webSocket.begin(websocket_host, websocket_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void loop()
{
  verificarWiFi();

  if (WiFi.status() == WL_CONNECTED)
  {
    webSocket.loop();
  }

  verificarObstaculo();

  static unsigned long lastTime = 0;

  if (millis() - lastTime > 3000)
  {
    lastTime = millis();

    if (WiFi.status() == WL_CONNECTED && websocketConectado)
    {
      webSocket.sendTXT("get");
      Serial.println("Solicitando movimiento...");
    }
  }

  yield();
}

void conectarWiFi()
{
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  Serial.println();
  Serial.print("Conectando WIFI");

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
    yield();
  }

  Serial.println();
  Serial.println("WIFI conectado");
  Serial.print("IP ESP8266: ");
  Serial.println(WiFi.localIP());
}

void verificarWiFi()
{
  if (WiFi.status() == WL_CONNECTED)
  {
    return;
  }

  if (millis() - ultimoIntentoWiFi > 5000)
  {
    ultimoIntentoWiFi = millis();
    Serial.println("WIFI desconectado, intentando reconectar...");
    WiFi.disconnect();
    WiFi.begin(ssid, password);
  }
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length)
{
  switch (type)
  {
    case WStype_DISCONNECTED:
      websocketConectado = false;
      Serial.println("WebSocket desconectado");
    break;

    case WStype_CONNECTED:
      websocketConectado = true;
      Serial.println("WebSocket conectado");
    break;

    case WStype_TEXT:
      procesarMovimiento(String((char*)payload));
    break;
  }
}

float medirDistancia()
{
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duracion = pulseIn(ECHO_PIN, HIGH, 30000);

  if (duracion == 0)
  {
    return -1;
  }

  return duracion * 0.0343 / 2.0;
}

bool verificarObstaculo()
{
  if (modoAutonomo)
  {
    return false;
  }

  float distancia = medirDistancia();

  if (distancia <= 0)
  {
    return false;
  }

  Serial.print("Distancia: ");
  Serial.print(distancia);
  Serial.println(" cm");

  enviarDistancia(distancia);

  if (distancia <= DISTANCIA_OBSTACULO_CM)
  {
    buscarRutaLibre(distancia);
    return true;
  }

  return false;
}

void enviarDistancia(float distancia)
{
  if (distancia <= 0 || WiFi.status() != WL_CONNECTED || !websocketConectado)
  {
    return;
  }

  if (millis() - ultimoEnvioDistancia < INTERVALO_ENVIO_DISTANCIA)
  {
    return;
  }

  ultimoEnvioDistancia = millis();

  StaticJsonDocument<128> doc;
  doc["tipo"] = "distancia";
  doc["distancia"] = distancia;

  String mensaje;
  serializeJson(doc, mensaje);
  webSocket.sendTXT(mensaje);
}

void registrarObstaculo(float distancia)
{
  if (WiFi.status() != WL_CONNECTED || !websocketConectado)
  {
    return;
  }

  if (ultimoEnvioObstaculo != 0 &&
      millis() - ultimoEnvioObstaculo < TIEMPO_ENTRE_OBSTACULOS)
  {
    return;
  }

  ultimoEnvioObstaculo = millis();

  StaticJsonDocument<128> doc;
  doc["tipo"] = "obstaculo";
  doc["distancia"] = distancia;

  String mensaje;
  serializeJson(doc, mensaje);
  webSocket.sendTXT(mensaje);
}

void reportarAutonomia(String estado, float distancia)
{
  if (WiFi.status() != WL_CONNECTED || !websocketConectado)
  {
    return;
  }

  StaticJsonDocument<128> doc;
  doc["tipo"] = "autonomia";
  doc["estado"] = estado;

  if (distancia > 0)
  {
    doc["distancia"] = distancia;
  }

  String mensaje;
  serializeJson(doc, mensaje);
  webSocket.sendTXT(mensaje);
}

void girarDerecha90()
{
  Serial.println("Girando 90 grados a la derecha...");

  analogWrite(IN_1, 0);
  analogWrite(IN_2, 220);
  analogWrite(IN_3, 0);
  analogWrite(IN_4, 220);

  unsigned long inicio = millis();

  while (millis() - inicio < TIEMPO_GIRO_90_MS)
  {
    if (WiFi.status() == WL_CONNECTED)
    {
      webSocket.loop();
    }

    yield();
    delay(10);
  }

  detenerMotores();
  delay(180);
}

void buscarRutaLibre(float distanciaInicial)
{
  modoAutonomo = true;
  detenerMotores();

  Serial.println("OBSTACULO DETECTADO");
  registrarObstaculo(distanciaInicial);
  reportarAutonomia("buscando", distanciaInicial);

  for (int giro = 0; giro < MAX_GIROS_BUSQUEDA; giro++)
  {
    reportarAutonomia("girando", distanciaInicial);
    girarDerecha90();

    float distancia = medirDistancia();

    if (distancia > 0)
    {
      enviarDistancia(distancia);
    }

    if (distancia > DISTANCIA_OBSTACULO_CM)
    {
      Serial.println("Ruta libre encontrada");
      reportarAutonomia("ruta_libre", distancia);
      modoAutonomo = false;
      return;
    }

    if (distancia > 0)
    {
      distanciaInicial = distancia;
      registrarObstaculo(distancia);
      reportarAutonomia("buscando", distancia);
    }
  }

  detenerMotores();
  Serial.println("No se encontro ruta libre");
  reportarAutonomia("sin_ruta", distanciaInicial);
  modoAutonomo = false;
}

void procesarMovimiento(String json)
{
  if (modoAutonomo)
  {
    Serial.println("Movimiento ignorado durante busqueda autonoma");
    return;
  }

  StaticJsonDocument<2048> doc;
  DeserializationError error = deserializeJson(doc, json);

  if (error || !doc.is<JsonArray>() || doc.size() == 0)
  {
    return;
  }

  JsonObject movimiento = doc[0];
  String fecha_hora = movimiento["fecha_hora"] | "";

  if (fecha_hora == ultimaFecha)
  {
    return;
  }

  ultimaFecha = fecha_hora;

  int mi_velocidad = movimiento["mi_velocidad"] | 0;
  int md_velocidad = movimiento["md_velocidad"] | 0;
  String mi_direccion = movimiento["mi_direccion"] | "STOP";
  String md_direccion = movimiento["md_direccion"] | "STOP";
  int tiempo = movimiento["mi_time"] | 0;

  int inputIA = 0;
  int inputIB = 0;
  int inputDA = 0;
  int inputDB = 0;

  if (mi_direccion == "ADELANTE")
  {
    inputIB = mi_velocidad;
  }
  else if (mi_direccion == "ATRAS")
  {
    inputIA = mi_velocidad;
  }

  if (md_direccion == "ADELANTE")
  {
    inputDA = md_velocidad;
  }
  else if (md_direccion == "ATRAS")
  {
    inputDB = md_velocidad;
  }

  moverCarro(inputIA, inputIB, inputDA, inputDB, tiempo);
}

void moverCarro(int inputIA, int inputIB, int inputDA, int inputDB, int tiempo)
{
  detenerMotores();
  delay(50);

  if (verificarObstaculo())
  {
    return;
  }

  analogWrite(IN_1, inputIA);
  analogWrite(IN_2, inputIB);
  analogWrite(IN_3, inputDA);
  analogWrite(IN_4, inputDB);

  if (tiempo <= 0)
  {
    return;
  }

  unsigned long inicio = millis();

  while (millis() - inicio < tiempo)
  {
    if (WiFi.status() == WL_CONNECTED)
    {
      webSocket.loop();
    }

    if (verificarObstaculo())
    {
      return;
    }

    yield();
    delay(50);
  }

  detenerMotores();
}

void detenerMotores()
{
  analogWrite(IN_1, 0);
  analogWrite(IN_2, 0);
  analogWrite(IN_3, 0);
  analogWrite(IN_4, 0);
}
