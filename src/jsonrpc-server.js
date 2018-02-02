const Connection = require('./connection'),
    JsonRPC = require('./jsonrpc'),
    http = require('http');

var Server = function() {
    this.errors = {
        PARSE_ERROR: {
            error: {
                code: -32700,
                message: 'Parse error'
            },
            httpCode: 400
        },
        INVALID_REQUEST: {
            error: {
                code: -32600,
                message: 'Invalid Request'
            },
            httpCode: 400
        },
        METHOD_IS_NOT_FOUND: {
            error: {
                code: -32601,
                message: 'Method not found'
            },
            httpCode: 400
        },
        INVALID_PARAMS: {
            error: {
                code: -32602,
                message: 'Invalid params'
            },
            httpCode: 400
        },
        INTERNAL_ERROR: {
            error: {
                code: -32603,
                message: 'Internal error'
            },
            httpCode: 500
        },
        SERVER_ERROR: {
            error: {
                code: -32000,
                message: 'Server error'
            },
            httpCode: 500
        }
    };

    this._events = {};
    this._httpserver = http.createServer();

    this._httpserver.on('request', (request, response)=>{
        let connection = new Connection(request, response);
        connection.get((json)=>{

            let jsonRpc = new JsonRPC(connection);

            // Проверим что это объект
            if (typeof(json) !== 'object') {
                jsonRpc.error(this.errors.PARSE_ERROR.error, this.errors.PARSE_ERROR.httpCode);
                return;
            }

            // Проверим что это объект по стандарту JsonRPC
            if (!json.jsonrpc || json.jsonrpc !== '2.0' || !json.method || typeof(json.method) !== 'string' || !json.params || typeof(json.params) !== 'object') {
                jsonRpc.error(this.errors.INVALID_REQUEST.error, this.errors.INVALID_REQUEST.httpCode);
                return;
            }

            if (this._events[json.method] === undefined || !this._events[json.method].fn || typeof(this._events[json.method].fn) !== 'function') {
                jsonRpc.error(this.errors.METHOD_IS_NOT_FOUND.error, this.errors.METHOD_IS_NOT_FOUND.httpCode);
                return;
            }

            // Если проверки прошли успешно
            
            // Если есть идентификатор запроса - присвоим его
            if (json.id) {
                jsonRpc.setId(json.id);
            }

            this._emit(json.method, json.params, jsonRpc);
        });
    });
}



Server.prototype._emit = function(event, params, jsonRpc) {
    // Если по какой-то причине метод не найден именно сейчас
    if (!this._events || !this._events[event] || !this._events[event].fn || !typeof(this._events[event].fn)  === 'function') {
        jsonRpc.error(this.errors.INTERNAL_ERROR.error, this.errors.INTERNAL_ERROR.httpCode);
        return;
    }

    // Если проверок не было указано
    if (!this._events[event].checks) {
        this._events[event].fn(params, jsonRpc);
        return;
    }

    // Проверим параметры
    let checkedParams = this._checkParams(this._events[event].checks, params);
    if (!checkedParams) {
        jsonRpc.error(this.errors.INVALID_PARAMS.error, this.errors.INVALID_PARAMS.httpCode);
        return;
    }

    this._events[event].fn(checkedParams, jsonRpc);
}

Server.prototype._checkParams = function(rules, params) {
    console.log(rules, params);
    var checkedParams = {};
    for (let param in rules) {
        if (rules[param] === true && params[param] !== undefined) {
            // Если параметр обязателен и он есть
            checkedParams[param] = params[param];
        } else if (rules[param] === true && params[param] === undefined) {
            // Если параметр обязателен и его нет - прерываемся
            return false;
        } if (rules[param] === false && params[param] !== undefined) {
            // Если параметр не обязателен и он есть
            checkedParams[param] = params[param];
        } else if (rules[param] === null && params[param] !== undefined && (params[param] === '' || params[param] === 0)) {
            // Если нулибельный параметр не обязателен, но он есть и равен пустой строке или нулю
            checkedParams[param] = null;
        }
    }

    return checkedParams;
}

Server.prototype.on = function(event, checks, func) {
    if (typeof(checks) === 'function') {
        func = checks;
        checks = false;
    }
    this._events[event] = {
        fn: func,
        checks: checks
    };
}

Server.prototype.setError = function(name, error, httpCode) {
    this.errors[name] = {
        error: error,
        httpCode: httpCode
    };
}

Server.prototype.listen = function(port, interface, callback) {
    this._httpserver.listen(port || 8080, interface, callback);
}

module.exports = Server;