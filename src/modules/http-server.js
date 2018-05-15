const http = require('http');

var Server = function(headers, server) {
    headers = headers || {};

    this._headers = {
        'Access-Control-Allow-Origin': headers['Access-Control-Allow-Origin'] || '*',
        'Access-Control-Allow-Methods': headers['Access-Control-Allow-Methods'] || 'OPTIONS, POST',
        'Access-Control-Allow-Headers': headers['Access-Control-Allow-Headers'] || 'Origin, Accept, Content-Type',
        'Content-Type': 'application/json'
    };

    this._server = server || http.createServer();

    this._server.on('request', (request, response) => {
        // Обработка OPTIONS
        if (request.method === 'OPTIONS') {
            this._send(response);
            return;
        }

        this._getRequestBody(request, (input)=>{
            this.onRequest(input, (output)=>{
                this._send(response, output);
            });
        })
    });

    this.onRequest = function(input, callback) {
        callback(input);
    }
}

Server.prototype._send = function(response, content) {
    response.writeHead(200, this._headers);
    response.end(content);
}

Server.prototype._getRequestBody = function(request, callback) {
    let buffers = [];
    request.on('data', (chunk) => {
        buffers.push(chunk);
    }).on('end', () => {
        let content = Buffer.concat(buffers).toString('utf8');
        callback(content);
    }).on('error', (e)=>{
        console.log(e);
        callback();
    });
}


Server.prototype.listen = function(options, callback) {
    options = options || {};
    this._server.listen(options.port || 8080, options.iface || '127.0.0.1', callback);
}

module.exports = Server;