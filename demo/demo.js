const JsonRPCServer = require('../src/jsonrpc-server');

let server = new JsonRPCServer();

server.on('Hello', {
    title: true
}, (params, response) => {
    let result = 'Hello, ' + params.title
    response(undefined, result);
});

server.on('Ping', (params, response) => {
    response(undefined, 'Pong');
});

// Складываем значения переданного массива длиной в 3 элемента
server.on('Summary', (params, response) => {
    var sum = 0;
    for (let i in params) {
        sum += params[i];
    }
    response(undefined, sum);
});

server.listen();
/*
server.nats({
    url: 'nats://localhost:4222'
}, 'MyChannel')*/