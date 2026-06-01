from flask import jsonify, request
from threading import Thread

from models.demo_model import DemoModel


class DemoController:

    @staticmethod
    def listar_demos():
        try:
            id_dispositivo = int(request.args.get('id_dispositivo', 1))
            limite = int(request.args.get('limite', 5))

            resultado = DemoModel.listar_demos(
                id_dispositivo,
                limite
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

    @staticmethod
    def crear_demo():
        try:
            data = request.get_json()
            resultado = DemoModel.crear_demo(data)

            return jsonify({
                "success": True,
                "data": resultado
            }), 200

        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500

    @staticmethod
    def visualizar_demo(id_demo):
        try:
            resultado = DemoModel.visualizar_demo(id_demo)

            return jsonify({
                "success": True,
                "data": resultado
            }), 200

        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500

    @staticmethod
    def repetir_demo(id_demo):
        return DemoController._ejecutar_demo(id_demo, "repitiendo")

    @staticmethod
    def ejecutar_demo(id_demo):
        return DemoController._ejecutar_demo(id_demo, "ejecutando")

    @staticmethod
    def _ejecutar_demo(id_demo, estado):
        try:
            data = request.get_json(silent=True) or {}
            id_dispositivo = data.get('id_dispositivo', 1)

            hilo = Thread(
                target=DemoModel.repetir_demo,
                args=(id_demo, id_dispositivo),
                daemon=True
            )
            hilo.start()

            return jsonify({
                "success": True,
                "data": {
                    "id_demo": id_demo,
                    "estado": estado
                }
            }), 200

        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500

    @staticmethod
    def eliminar_demo(id_demo):
        try:
            resultado = DemoModel.eliminar_demo(id_demo)

            return jsonify({
                "success": True,
                "data": resultado
            }), 200

        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
