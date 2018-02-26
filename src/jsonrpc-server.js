const errors = require('./modules/errors'),
    http = require('http');

var Server = function(headers) {
    this._headers = headers || {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS, POST',
        'Access-Control-Allow-Headers': 'Origin, Accept, Content-Type'
    };

    this._headers['Content-Type'] = 'application/json';

    this._methods = {};
    
    this._httpserver = http.createServer();

    this._httpserver.on('request', (request, response) => {
        this._onRequest(request, response);
    });
}

Server.prototype.listen = function(port, interface, callback) {
    if (typeof(interface) === 'function') {
        callback = interface;
        interface = undefined;
    }

    this._httpserver.listen(port || 8080, interface, callback);
}

/**
 * Метод навешивает реакцию на метод JSONRPC
 * @param {string} event - 
 * @param {object} rules 
 * @param {function} func 
 */
Server.prototype.on = function(method, rules, func) {
    if (typeof(rules) === 'function') {
        func = rules;
        rules = false;
    }

    this._methods[method] = {
        fn: func,
        rules: rules
    };
}

Server.prototype._onRequest = function(request, response) {
    if (request.method === 'OPTIONS') {
        this._send(response);
        return;
    }
    
    this._getBody(request, (content) => {
        var jrpc = {
            jsonrpc: '2.0',
            id: null
        };

        // Если ошибка при получении тела запроса
        if (!content) {
            jrpc.error = errors.INVALID_REQUEST;
            this._send(response, jrpc);
            return;
        }

        // Пробуем разобрать тело запроса как JSON
        var json;
        try {
            json = JSON.parse(content);
        } catch(e) {
            console.log(e);
            jrpc.error = errors.PARSE_ERROR;
            this._send(response, jrpc);
            return;
        }

        // Можем присвоить идентификатор, если он есть в запросе
        jrpc.id = json.id || null;

        // Проверим признак спецификации
        if (!json.jsonrpc || json.jsonrpc !== '2.0') {
            jrpc.error = errors.INVALID_REQUEST;
            this._send(response, jrpc);
            return;
        }

        // Проверим наличие метода, и описан ли он
        if (!json.method || !this._methods[json.method] || !this._methods[json.method].fn) {
            jrpc.error = errors.METHOD_IS_NOT_FOUND;
            this._send(response, jrpc);
            return;
        }

        // Проверим параметры
        this._checkParams(this._methods[json.method].rules, json.params, (err, params) => {
            if (err) {
                jrpc.error = err;
                this._send(response, jrpc);
                return;
            }

            // Выполним метод, передав в него параметры и коллбэк
            this._methods[json.method].fn(params, (error, result)=>{
                if (err) {
                    jrpc.error = error;
                    this._send(response, jrpc);
                    return;
                }

                jrpc.result = result;
                this._send(response, jrpc);
                return;
            });

        });
    });
}

Server.prototype._getBody = function(request, callback) {
    let buffers = [];
    request.on('data', (chunk) => {
        buffers.push(chunk);
    }).on('end', () => {
        let content = Buffer.concat(buffers).toString('utf8');
        callback(content);
    }).on('error', (e)=>{
        console.log(e);
        callback();
    })
}

Server.prototype._checkParams = function(rules, params, callback) {
    // Если параметры не переданы
    if (!params || typeof(params) !== 'object') {
        let error = Object.assign({data: 'Params is not object or array'}, errors.INVALID_PARAMS);
        callback(error);
        return;
    }

    // Если правила не заданы
    if (!rules && rules !== 0) {
        callback(undefined, params);
        return;
    }


    // Если проверяется длина массива
    if (typeof(rules) === 'number') {
        // Если передан не массив
        if (!Array.isArray(params)) {
            let error = Object.assign({data: 'Params must be array'}, errors.INVALID_PARAMS);
            callback(error);
            return;
        }

        // Если указана длина массива и он ей не соответствует
        if (rules !== 0 && params.length !== rules) {
            let error = Object.assign({data: 'Params array must have length ' + rules}, errors.INVALID_PARAMS);
            callback(error);
            return;
        }

        // Если длина не указана (0) или массив ей соответствует
        callback(undefined, params);
        return;
    }

    // Если проверяется объект
    var checkedParams = {};
    for (let param in rules) {
        if (rules[param] === true && params[param] !== undefined) {
            // Если параметр обязателен и он есть
            checkedParams[param] = params[param];
        } else if (rules[param] === true && params[param] === undefined) {
            // Если параметр обязателен и его нет - прерываемся
            let error = Object.assign({data: 'Param ' + param + ' is not finded'}, errors.INVALID_PARAMS);
            callback(error);
            return;
        } else if (rules[param] === false && params[param] !== undefined) {
            // Если параметр не обязателен и он есть
            checkedParams[param] = params[param];
        } else if (rules[param] === null && !params[param]) {
            // Если нулибельный параметр не обязателен, но он есть и равен пустой строке или нулю
            checkedParams[param] = null;
        } else if (rules[param] === null && params[param]) {
            checkedParams[param] = params[param];
        }
    }

    callback(undefined, checkedParams);
}



Server.prototype._send = function(response, jrpc) {
    response.writeHead(200, this._headers);
    let content = jrpc && jrpc.error || jrpc.id ? JSON.stringify(jrpc) : undefined;
    response.end(content);
}

module.exports = Server;
