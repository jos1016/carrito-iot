from config.database import Database


class ParametroModel:

    @staticmethod
    def actualizar_parametros(data):

        conexion = Database.get_connection()
        cursor = conexion.cursor(dictionary=True)

        cursor.callproc(
            'sp_actualizar_parametros',
            (
                data['id_parametro'],
                data['velocidad'],
                data['factor_vuelta'],
                data['factor_tiempo'],
                data['factor_giro90']
            )
        )

        conexion.commit()

        cursor.close()
        conexion.close()

        return {
            "mensaje": "Parámetros actualizados"
        }