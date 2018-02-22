const JsonRPCServer = require('../src/jsonrpc-server');

let corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS, POST',
    'Access-Control-Allow-Headers': 'Origin, Authorization, Accept, Content-Type'
};

let server = new JsonRPCServer(corsHeaders);

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