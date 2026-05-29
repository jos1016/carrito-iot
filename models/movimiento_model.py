from config.database import Database


class MovimientoModel:

    @staticmethod
    def agregar_movimiento(data):

        conexion = Database.get_connection()
        cursor = conexion.cursor(dictionary=True)

        cursor.callproc(
            'sp_agregar_movimiento',
            (
                data['id_dispositivo'],
                data['id_movimiento'],
                data['origen']
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
    def ultimo_movimiento(id_dispositivo, id_parametro):

        conexion = Database.get_connection()
        cursor = conexion.cursor(dictionary=True)

        cursor.callproc(
            'sp_ultimo_movimiento',
            (
                id_dispositivo,
                id_parametro
            )
        )

        resultado = None

        for result in cursor.stored_results():
            resultado = result.fetchall()

        cursor.close()
        conexion.close()

        return resultado