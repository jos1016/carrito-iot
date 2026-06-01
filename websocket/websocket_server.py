import socket
import threading
import json
import base64
import hashlib

from models.movimiento_model import MovimientoModel
from models.evento_model import EventoModel


class WebSocketServer:
    clientes = set()
    clientes_lock = threading.Lock()

    @staticmethod
    def agregar_cliente(cliente):
        with WebSocketServer.clientes_lock:
            WebSocketServer.clientes.add(cliente)

    @staticmethod
    def quitar_cliente(cliente):
        with WebSocketServer.clientes_lock:
            WebSocketServer.clientes.discard(cliente)

    @staticmethod
    def enviar(cliente, mensaje):
        cliente.send(
            WebSocketServer.encode_message(mensaje)
        )

    @staticmethod
    def broadcast(mensaje, excluir=None):
        with WebSocketServer.clientes_lock:
            clientes = list(WebSocketServer.clientes)

        for cliente in clientes:
            if cliente is excluir:
                continue

            try:
                WebSocketServer.enviar(cliente, mensaje)
            except Exception:
                WebSocketServer.quitar_cliente(cliente)

    @staticmethod
    def websocket_handshake(cliente):

        request = cliente.recv(1024).decode()

        key = ""

        for line in request.split("\r\n"):
            if "Sec-WebSocket-Key" in line:
                key = line.split(": ")[1]

        GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

        response_key = base64.b64encode(
            hashlib.sha1((key + GUID).encode()).digest()
        ).decode()

        response = (
            "HTTP/1.1 101 Switching Protocols\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Accept: {response_key}\r\n\r\n"
        )

        cliente.send(response.encode())

    @staticmethod
    def decode_message(data):

        payload_length = data[1] & 127

        if payload_length == 126:
            mask = data[4:8]
            encoded = data[8:]

        elif payload_length == 127:
            mask = data[10:14]
            encoded = data[14:]

        else:
            mask = data[2:6]
            encoded = data[6:]

        decoded = bytearray()

        for i in range(len(encoded)):
            decoded.append(encoded[i] ^ mask[i % 4])

        return decoded.decode()

    @staticmethod
    def encode_message(message):

        message_bytes = message.encode()

        frame = bytearray()

        frame.append(129)

        length = len(message_bytes)

        if length <= 125:

            frame.append(length)

        elif length >= 126 and length <= 65535:

            frame.append(126)
            frame.extend(length.to_bytes(2, 'big'))

        else:

            frame.append(127)
            frame.extend(length.to_bytes(8, 'big'))

        frame.extend(message_bytes)

        return frame

    @staticmethod
    def crear_socket_servidor():

        servidor = socket.socket(
            socket.AF_INET,
            socket.SOCK_STREAM
        )

        if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            servidor.setsockopt(
                socket.SOL_SOCKET,
                socket.SO_EXCLUSIVEADDRUSE,
                1
            )

        servidor.bind(('0.0.0.0', 5001))
        servidor.listen(5)

        return servidor

    @staticmethod
    def handle_client(cliente):

        try:

            WebSocketServer.websocket_handshake(cliente)
            WebSocketServer.agregar_cliente(cliente)

            print("Cliente WebSocket conectado")

            while True:

                data = cliente.recv(1024)

                if not data:
                    break

                mensaje = WebSocketServer.decode_message(data)

                print("Mensaje recibido:")
                print(mensaje)

                # ==================================
                # INTENTAR LEER JSON
                # ==================================

                try:

                    data_json = json.loads(mensaje)
                    tipo = data_json.get("tipo")

                    # ==================================
                    # OBSTACULO
                    # ==================================

                    if tipo == "obstaculo":

                        distancia = data_json["distancia"]

                        print("OBSTACULO DETECTADO")
                        print(f"Distancia: {distancia} cm")

                        EventoModel.registrar_obstaculo(
                            distancia
                        )

                        response = json.dumps({
                            "evento": "obstaculo",
                            "distancia": distancia
                        })

                        WebSocketServer.enviar(cliente, response)
                        WebSocketServer.broadcast(response, excluir=cliente)

                        continue

                    if tipo == "distancia":

                        distancia = data_json.get("distancia")

                        response = json.dumps({
                            "evento": "distancia",
                            "distancia": distancia
                        })

                        WebSocketServer.broadcast(response, excluir=cliente)

                        continue

                    if tipo == "autonomia":

                        estado = data_json.get("estado", "buscando")
                        distancia = data_json.get("distancia")

                        print("AUTONOMIA REPORTADA")
                        print(f"Estado: {estado}")

                        response = json.dumps({
                            "evento": "autonomia",
                            "estado": estado,
                            "distancia": distancia
                        })

                        WebSocketServer.broadcast(response, excluir=cliente)

                        continue

                except Exception as e:

                    print("No es JSON:", e)

                # ==================================
                # CONSULTAR MOVIMIENTO
                # ==================================

                if mensaje == "get":

                    resultado = MovimientoModel.ultimo_movimiento(
                        1,
                        1
                    )

                    response = json.dumps(
                        resultado,
                        default=str
                    )

                    WebSocketServer.enviar(cliente, response)

        except Exception as e:

            print("ERROR:", e)

        finally:

            WebSocketServer.quitar_cliente(cliente)
            cliente.close()

    @staticmethod
    def start(servidor=None):

        if servidor is None:
            servidor = WebSocketServer.crear_socket_servidor()

        print("WebSocket activo en puerto 5001")

        while True:

            cliente, addr = servidor.accept()

            print(f"Cliente conectado: {addr}")

            hilo = threading.Thread(
                target=WebSocketServer.handle_client,
                args=(cliente,)
            )

            hilo.start()
