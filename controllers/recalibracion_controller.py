from flask import jsonify, request

from websocket.websocket_server import WebSocketServer


class RecalibracionController:

    @staticmethod
    def recalibrar():
        try:
            data = request.get_json(silent=True) or {}
            duracion = int(data.get('duracion_ms', 1000))

            WebSocketServer.enviar_recalibracion(duracion)

            return jsonify({
                "success": True,
                "data": {
                    "tipo": "recalibrar",
                    "duracion_ms": duracion
                }
            }), 200

        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
