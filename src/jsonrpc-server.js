const errors = require('jrpc-errors'),
    HttpServer = require('./modules/http-server'),
    NatsServer = require('./modules/nats-server');

var Server = function(headers, server) {
    this._methods = {};

    this._http = new HttpServer(headers, server);
    
    var self = this;
    
    this._http.onRequest = function(input, callback) {
        self._onRequest(input, callback);
    }
    
    this._nats = new NatsServer();
    this._nats.onRequest = function(input, callback) {
        self._onRequest(input, callback);
    }
    
}

/**
 * Метод навешивает реакцию на метод JSONRPC
 * @param {string} event Метод
 * @param {object} rules Правила валидации параметров
 * @param {function} func Функция, выполняемая для обработки метода
 */
Server.prototype.on = function(method, func) {
    this._methods[method] = func;
};


Server.prototype.http = function(options, callback) {
    this._http.listen(options, callback);
};

Server.prototype.nats = function(channel, options, callback) {
    this._nats.listen(channel, options, callback);
}



Server.prototype._onRequest = function(content, callback) {
    let jrpc = {
        jsonrpc: "2.0",
        id: null
    }

    // Если ошибка при получении тела запроса
    if (!content) {
        jrpc.error = errors.INVALID_REQUEST;
        callback(JSON.stringify(jrpc));
        return;
    }

    // Пробуем разобрать тело запроса как JSON
    var json;
    try {
        json = JSON.parse(content);
    } catch(e) {
        jrpc.error = errors.PARSE_ERROR;
        callback(JSON.stringify(jrpc));
        return;
    }

    // Можем присвоить идентификатор, если он есть в запросе
    jrpc.id = json.id || null;
    
    // Параметры - не обязательный элемент. Если он не передан - присвоим NULL, так как при проверке типа - это тоже объект
    json.params = json.params || null;

    // Проверим признак спецификации
    if (!json.jsonrpc || json.jsonrpc !== '2.0') {
        jrpc.error = errors.INVALID_REQUEST;
        callback(JSON.stringify(jrpc));
        return;
    }

    // Проверим наличие метода, и описан ли он
    if (!json.method || !this._methods[json.method]) {
        jrpc.error = errors.METHOD_IS_NOT_FOUND;
        callback(JSON.stringify(jrpc));
        return;
    }

    // Проверим, являются ли параметры объектом или массивом
    if (typeof(json.params) !== 'object') {
        jrpc.error = errors.INVALID_PARAMS;
        callback(JSON.stringify(jrpc));
        return;
    }

    // Пытаемся выполнить метод обработчика
    try {
        this._methods[json.method](json.params, (error, result)=>{
            // При обработанной ошибке
            if (error) {
                jrpc.error = error;
                callback(JSON.stringify(jrpc));
                return;
            }

            jrpc.result = result;

            // Отправляем ответ, только в случае, если задан идентификатор
            callback(jrpc.id ? JSON.stringify(jrpc) : '');
        });
    } catch (e) {
        console.log(e)
        jrpc.error = Object.assign(errors.INTERNAL_ERROR, {data: e.message});
        callback(JSON.stringify(jrpc));
    }

};

module.exports = Server;
