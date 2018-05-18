const NATS = require('nats');

var NatsServer = function() {
    this._server;
    
    this.onRequest = function(input, callback) {
        callback(input);
    };
}



NatsServer.prototype.listen = function( channel, options,callback) {
    if (typeof(options) === 'function') {
        callback = options;
        options = {};
    }
    
    options = options || {};
    options.url = options.url || 'nats://127.0.0.1:4222';

    this._server = NATS.connect(options);

    if (callback) {
        this._server.on('connect', callback);
    }
    
    this._server.subscribe(channel, (input, responseChannel)=>{
        this.onRequest(input, (output)=>{
            output = output || '{}';
            this._server.publish(responseChannel, output);
        })
    });
}

module.exports = NatsServer;