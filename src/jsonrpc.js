var JsonRPC = function(connection) {
    this._connection = connection;
    this._id = null;
}

JsonRPC.prototype.setId = function(id) {
    this._id = id || null;
}

/**
 * Метод возвращает результат. 
 * @param {any} result 
 */
JsonRPC.prototype.result = function(result) {
    // Если ответ без контекста и это не ошибка
    if (!this._id) {
        this._connection.send();
        return;
    }

    let json = {
        jsonrpc: "2.0",
        id: this._id,
        result: result
    }

    this._connection.send(json);
}

/**
 * Метод возвращает ошибку.
 * @param {object} error 
 * @param {integer} httpCode 
 */
JsonRPC.prototype.error = function(error, httpCode) {
    let json = {
        jsonrpc: "2.0",
        id: this._id,
        error: error
    }

    this._connection.send(json, httpCode);
}

/**
 * Метод отправляет ответ с ошибкой или результатом
 * @param {object} error 
 * @param {any} result 
 * @param {integer} httpCode 
 */
JsonRPC.prototype.send = function(error, result, httpCode) {
    if (!error && !this._id) {
        this._connection.send(undefined, httpCode);
        return;
    }

    let json = {
        jsonrpc: "2.0",
        id: this._id,
        result: result,
        error: error
    }

    this._connection.send(json, httpCode);
}

module.exports = JsonRPC;