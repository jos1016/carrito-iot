from config.database import Database


class EstatusModel:

    @staticmethod
    def ultimos_movimientos(id_dispositivo=1, limite=5):
        conexion = Database.get_connection()
        cursor = conexion.cursor(dictionary=True)

        cursor.callproc(
            'sp_ultimos_10_movimientos',
            (
                id_dispositivo,
            )
        )

        resultado = []

        for result in cursor.stored_results():
            resultado = result.fetchall()

        cursor.close()
        conexion.close()

        return resultado[:limite]

    @staticmethod
    def ultimos_obstaculos(id_dispositivo=1, limite=5):
        conexion = Database.get_connection()
        cursor = conexion.cursor(dictionary=True)

        cursor.callproc(
            'sp_ultimos_10_obstaculos',
            (
                id_dispositivo,
            )
        )

        resultado = []

        for result in cursor.stored_results():
            resultado = result.fetchall()

        cursor.close()
        conexion.close()

        return resultado[:limite]
