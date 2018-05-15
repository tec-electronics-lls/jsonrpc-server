var Validator = function(error) {
    this._error = error || {
        code: -32602,
        message: 'INVALID_PARAMS'
    }
}

Validator.prototype.check = function(params, rules, callback) {
    // Если параметры не переданы
    if (!params || typeof(params) !== 'object') {
        let error = Object.assign({data: 'Params is not object or array'}, this._error);
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
            let error = Object.assign({data: 'Params must be array'}, this._error);
            callback(error);
            return;
        }

        // Если указана длина массива и он ей не соответствует
        if (rules !== 0 && params.length !== rules) {
            let error = Object.assign({data: 'Params array must have length ' + rules}, this._error);
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
            let error = Object.assign({data: 'Param ' + param + ' is not finded'}, this._error);
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

module.exports = Validator;