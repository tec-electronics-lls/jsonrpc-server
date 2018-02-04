const JsonRPCServer = require('../src/jsonrpc-server');

let server = new JsonRPCServer();

server.on('Hello', {
    title: true
}, (params, conn) => {
    let result = 'Hello, ' + params.title
    conn.result(result);
});

server.on('Ping', (params, conn) => {
    conn.result('Pong');
});

// Складываем значения переданного массива без ограничения по длине
server.on('Summary', 3, (params, conn) => {
    let sum = 0;
    for (let i in params) {
        sum += params[i];
    }
    conn.result(sum);
});

server.listen();