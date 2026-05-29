from flask import request, jsonify
from models.parametro_model import ParametroModel


class ParametroController:

    @staticmethod
    def actualizar_parametros():

        try:

            data = request.get_json()

            resultado = ParametroModel.actualizar_parametros(data)

            return jsonify({
                "success": True,
                "data": resultado
            }), 200

        except Exception as e:

            return jsonify({
                "success": False,
                "error": str(e)
            }), 500