from flask import request, jsonify
from models.movimiento_model import MovimientoModel


class MovimientoController:

    @staticmethod
    def agregar_movimiento():

        try:

            data = request.get_json()

            resultado = MovimientoModel.agregar_movimiento(data)

            return jsonify({
                "success": True,
                "data": resultado
            }), 200

        except Exception as e:

            return jsonify({
                "success": False,
                "error": str(e)
            }), 500