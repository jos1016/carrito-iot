from flask import request, jsonify
import json

from models.movimiento_model import MovimientoModel
from websocket.websocket_server import WebSocketServer


class MovimientoController:

    @staticmethod
    def agregar_movimiento():

        try:

            data = request.get_json()

            resultado = MovimientoModel.agregar_movimiento(data)
            movimiento = MovimientoModel.ultimo_movimiento(
                data['id_dispositivo'],
                1
            )

            if movimiento:
                movimiento[0]['control_mode'] = data.get(
                    'control_mode',
                    ''
                )

            WebSocketServer.broadcast(
                json.dumps(
                    movimiento,
                    default=str
                )
            )

            return jsonify({
                "success": True,
                "data": resultado
            }), 200

        except Exception as e:

            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
