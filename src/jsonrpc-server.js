const errors = require('./modules/jsonrpc-errors'),
    HttpServer = require('./modules/http-server'),
    NatsServer = require('./modules/nats-server');

var Server = function(headers, server) {
    this._methods = {};

    this._http = new HttpServer(headers, server);
    
    var self = this;
    
    this._http.onRequest = function(input, callback) {
        self._onRequest(input, callback, 'http');
    }
    
    this._nats = new NatsServer();
    this._nats.onRequest = function(input, channel, callback) {
        self._onRequest(input, callback, channel);
    }
    
}

/**
 * Метод навешивает реакцию на метод JSONRPC
 * @param {string} event Метод
 * @param {object} rules Правила валидации параметров
 * @param {function} func Функция, выполняемая для обработки метода
 */
Server.prototype.on = function(method, validator, func) {
    if (!func) {
        func = validator;
        validator = function(params) {
            return params;
        }
    }
    this._methods[method] = {
        func: func,
        validator: validator
    };
};


Server.prototype.http = function(options, callback) {
    this._http.listen(options, callback);
};

Server.prototype.nats = function(channel, options, callback) {
    this._nats.listen(channel, options, callback);
}

Server.prototype.addNatsChannel = function(channel, callback) {
    this._nats.addChannel(channel, callback);
}



Server.prototype._onRequest = function(content, callback, channel) {
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

    // Проверим параметры
    let params;

    try {
        if (typeof(this._methods[json.method].validator) === 'object') {
            params = this._methods[json.method].validator.check(json.params);
        } else if (typeof(this._methods[json.method].validator) === 'function'){
            params = this._methods[json.method].validator(json.params);
        } else {
            params = json.params;
        }
    } catch(e) {
        jrpc.error = Object.assign(errors.INVALID_PARAMS, {data: e.message});
        callback(JSON.stringify(jrpc));
        return;
    }

    // Пытаемся выполнить метод обработчика
    try {
        if (this._methods[json.method].func.length === 1) {
            this._methods[json.method].func((error, result)=>{
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
        } else if(this._methods[json.method].func.length === 2) {
            this._methods[json.method].func(json.params, (error, result)=>{
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
        } else if (this._methods[json.method].func.length === 3) {
            this._methods[json.method].func(json.params, channel, (error, result)=>{
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
        } else {
            throw new Error('Invalid method arguments');
        }
    } catch (e) {
        console.log(e)
        jrpc.error = Object.assign(errors.INTERNAL_ERROR, {data: e.message});
        callback(JSON.stringify(jrpc));
    }

};

module.exports = Server;
