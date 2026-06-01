import json
import time

from config.database import Database
from models.movimiento_model import MovimientoModel
from websocket.websocket_server import WebSocketServer


class DemoModel:

    @staticmethod
    def crear_demo(data):
        conexion = Database.get_connection()
        cursor = conexion.cursor(dictionary=True)

        movimientos = data.get('movimientos', [])

        cursor.callproc(
            'sp_crear_demo',
            (
                data.get('nombre'),
                data.get('descripcion', ''),
                data.get('id_dispositivo', 1),
                json.dumps(movimientos)
            )
        )

        resultado = None

        for result in cursor.stored_results():
            resultado = result.fetchall()

        conexion.commit()
        cursor.close()
        conexion.close()

        return resultado

    @staticmethod
    def listar_demos(id_dispositivo=1, limite=5):
        conexion = Database.get_connection()
        cursor = conexion.cursor(dictionary=True)

        cursor.callproc(
            'sp_ultimas_demos',
            (
                id_dispositivo,
                limite
            )
        )

        resultado = []

        for result in cursor.stored_results():
            resultado = result.fetchall()

        cursor.close()
        conexion.close()

        return resultado

    @staticmethod
    def visualizar_demo(id_demo):
        conexion = Database.get_connection()
        cursor = conexion.cursor(dictionary=True)

        cursor.callproc(
            'sp_visualizar_demo',
            (
                id_demo,
            )
        )

        resultados = []

        for result in cursor.stored_results():
            resultados.append(result.fetchall())

        cursor.close()
        conexion.close()

        return {
            "demo": resultados[0][0] if resultados and resultados[0] else None,
            "movimientos": resultados[1] if len(resultados) > 1 else []
        }

    @staticmethod
    def repetir_demo(id_demo, id_dispositivo=1):
        demo = DemoModel.visualizar_demo(id_demo)
        movimientos = demo.get("movimientos", [])

        total = 0

        for movimiento in movimientos:
            clave = movimiento.get("movimiento_clave")
            duracion = movimiento.get("duracion_ms") or 1200

            id_movimiento = DemoModel.obtener_id_movimiento(clave)

            if id_movimiento is None:
                continue

            DemoModel.insertar_movimiento_demo(
                id_dispositivo,
                id_movimiento
            )

            total += 1

            pausa = max(float(duracion) / 1000.0, 0.8)
            time.sleep(pausa)

        return [{
            "id_demo": id_demo,
            "total_movimientos": total
        }]

    @staticmethod
    def obtener_id_movimiento(clave):
        conexion = Database.get_connection()
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id_movimiento
            FROM catalogo_movimientos
            WHERE clave = %s AND activo = 1
            LIMIT 1
            """,
            (
                clave,
            )
        )

        resultado = cursor.fetchone()

        cursor.close()
        conexion.close()

        return resultado["id_movimiento"] if resultado else None

    @staticmethod
    def insertar_movimiento_demo(id_dispositivo, id_movimiento):
        conexion = Database.get_connection()
        cursor = conexion.cursor(dictionary=True)

        cursor.callproc(
            'sp_agregar_movimiento',
            (
                id_dispositivo,
                id_movimiento,
                'DEMO'
            )
        )

        for result in cursor.stored_results():
            result.fetchall()

        conexion.commit()
        cursor.close()
        conexion.close()

        movimiento = MovimientoModel.ultimo_movimiento(
            id_dispositivo,
            1
        )

        WebSocketServer.broadcast(
            json.dumps(
                movimiento,
                default=str
            )
        )

    @staticmethod
    def eliminar_demo(id_demo):
        conexion = Database.get_connection()
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            DELETE FROM log_demo_ejecuciones
            WHERE id_demo = %s
            """,
            (
                id_demo,
            )
        )

        cursor.execute(
            """
            DELETE FROM demos
            WHERE id_demo = %s
            """,
            (
                id_demo,
            )
        )

        eliminados = cursor.rowcount

        conexion.commit()
        cursor.close()
        conexion.close()

        if eliminados == 0:
            raise ValueError("Demo no encontrado")

        return {
            "id_demo": id_demo,
            "eliminado": True
        }
