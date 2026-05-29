import mysql.connector

class Database:

    @staticmethod
    def get_connection():
        return mysql.connector.connect(
            host="127.0.0.1",
            user="root",
            password="1234",
            database="iot_cars",
            port=3306
        )