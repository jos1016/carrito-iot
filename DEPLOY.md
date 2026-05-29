# Despliegue del proyecto

## Opcion recomendada para el proyecto completo

Este proyecto usa Flask, MySQL y WebSocket. GitHub Pages solo sirve archivos estaticos, por lo que no puede ejecutar `app.py`, conectarse a MySQL ni levantar el WebSocket del carrito.

Para entregar la aplicacion completa, usa un hosting tipo Render, Railway, PythonAnywhere o una computadora/servidor encendido con los puertos abiertos.

## Subir codigo a GitHub

```powershell
git init
git add .
git commit -m "Proyecto carrito IoT"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/carrito-iot.git
git push -u origin main
```

## Ejecutar localmente

```powershell
pip install -r requirements.txt
python app.py
```

Abrir:

```text
http://127.0.0.1:5000
```

O desde otro dispositivo en la misma red:

```text
http://10.205.63.78:5000
```

## Nota para GitHub Pages

Si el profesor pide especificamente GitHub Pages, se puede publicar una pagina estatica informativa o una version estatica de la interfaz, pero no funcionara el backend Flask ni el WebSocket sin un servidor adicional.

Arquitectura correcta si se usa GitHub Pages:

```text
GitHub Pages: frontend estatico
Hosting backend: Flask + MySQL + WebSocket
ESP8266: conectado al backend por WebSocket
```
