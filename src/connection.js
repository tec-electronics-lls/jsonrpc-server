var Connection = function(request, response) {
    this._request = request;
    this._response = response;
}

/**
 * Функция запускает получение тела запроса
 * По окончанию работы вызывает коллбэк в который передает полученный объект JSON
 * Если получен не JSON - вернется undefined
 * 
 * @param {function} callback Функция, вызываемая по окончанию приема тела запроса
 */
Connection.prototype.get = function(callback) {
    let buffers = [];
    this._request.on('data', (chunk) => {
        buffers.push(chunk);
    }).on('end', () => {
        let content = Buffer.concat(buffers).toString();
        let json;
        
        // Пробуем разобрать JSON
        try {
            json = JSON.parse(content);
        } catch (err) {
            console.log('Request content is not parseble', content);
        }

        // Вызываем коллбэк
        if (callback) {
            callback(json);
        }
    })
}


/**
 * Метод отправляет JSON пользователю и завершает соединение
 * Если передан не объект, пользователь получит ошибку сервера 500
 * 
 * @param {object} data Объект JSON, который будет отправлен
 */
Connection.prototype.send = function(data, httpCode) {
    // Если данные не переданы - ответ не подразумевает контента
    if (data === undefined) {
        this._response.writeHead(httpCode || 200);
        this._response.end();
        return;
    }

    // Если данные - не объект
    if (typeof(data) !== 'object' ) {
        console.log('Is not object for JSON response', data);
        this._response.writeHead(500);
        this._response.end();
        return;
    }

    let content = Buffer.from(JSON.stringify(data, undefined, 4));

    let headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(content, 'utf8')
    }
    
    this._response.writeHead(httpCode || 200, headers);
    this._response.end(content.toString('utf8'));
}

module.exports = Connection;