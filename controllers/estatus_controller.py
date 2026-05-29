from flask import jsonify, request

from models.estatus_model import EstatusModel


class EstatusController:

    @staticmethod
    def ultimos_estatus():
        try:
            id_dispositivo = int(request.args.get('id_dispositivo', 1))
            limite = int(request.args.get('limite', 5))

            movimientos = EstatusModel.ultimos_movimientos(
                id_dispositivo,
                limite
            )
            obstaculos = EstatusModel.ultimos_obstaculos(
                id_dispositivo,
                limite
            )

            return jsonify({
                "success": True,
                "data": {
                    "movimientos": movimientos,
                    "obstaculos": obstaculos
                }
            }), 200

        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
