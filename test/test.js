const JsonRPCServer = require('../src/jsonrpc-server');

let server = new JsonRPCServer();
server.on('test', {
    yota: true,
    alfa: false,
    omega: false

}, (params, conn) => {
    conn.result(params);
});
server.listen();

