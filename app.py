from flask import Flask, render_template
from threading import Thread

from controllers.movimiento_controller import MovimientoController
from controllers.parametro_controller import ParametroController
from controllers.demo_controller import DemoController
from controllers.estatus_controller import EstatusController
from controllers.recalibracion_controller import RecalibracionController
from websocket.websocket_server import WebSocketServer


app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/movimiento', methods=['POST'])
def agregar_movimiento():
    return MovimientoController.agregar_movimiento()


@app.route('/api/parametros', methods=['PUT'])
def actualizar_parametros():
    return ParametroController.actualizar_parametros()


@app.route('/api/estatus', methods=['GET'])
def ultimos_estatus():
    return EstatusController.ultimos_estatus()


@app.route('/api/recalibrar', methods=['POST'])
def recalibrar():
    return RecalibracionController.recalibrar()


@app.route('/api/demos', methods=['GET'])
def listar_demos():
    return DemoController.listar_demos()


@app.route('/api/demos', methods=['POST'])
def crear_demo():
    return DemoController.crear_demo()


@app.route('/api/demos/<int:id_demo>', methods=['GET'])
def visualizar_demo(id_demo):
    return DemoController.visualizar_demo(id_demo)


@app.route('/api/demos/<int:id_demo>/repetir', methods=['POST'])
def repetir_demo(id_demo):
    return DemoController.repetir_demo(id_demo)


if __name__ == '__main__':
    websocket_thread = Thread(
        target=WebSocketServer.start,
        daemon=True
    )
    websocket_thread.start()

    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        use_reloader=False
    )
