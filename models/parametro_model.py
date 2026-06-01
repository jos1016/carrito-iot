from config.database import Database


class ParametroModel:

    @staticmethod
    def actualizar_parametros(data):

        conexion = Database.get_connection()
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            '''
            SELECT velocidad, factor_vuelta, factor_tiempo, factor_giro_90
            FROM parametros
            WHERE id_parametro = %s
            ''',
            (data['id_parametro'],)
        )

        parametro = cursor.fetchone()

        if not parametro:
            cursor.close()
            conexion.close()
            raise ValueError('Parametro no encontrado')

        sin_cambios = (
            int(parametro['velocidad']) == int(data['velocidad']) and
            float(parametro['factor_vuelta']) == float(data['factor_vuelta']) and
            float(parametro['factor_tiempo']) == float(data['factor_tiempo']) and
            float(parametro['factor_giro_90']) == float(data['factor_giro90'])
        )

        if sin_cambios:
            cursor.close()
            conexion.close()
            return {
                "mensaje": "Parametros sin cambios"
            }

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
