from config.database import Database


class EventoModel:

    @staticmethod
    def registrar_obstaculo(distancia):

        conexion = Database.get_connection()

        cursor = conexion.cursor(dictionary=True)

        cursor.callproc(
            'sp_agregar_obstaculo',
            (
                1,  # id_dispositivo
                distancia,
                'PARADA_EMERGENCIA'
            )
        )

        conexion.commit()

        resultado = None

        for result in cursor.stored_results():
            resultado = result.fetchall()

        cursor.close()
        conexion.close()

        return resultado