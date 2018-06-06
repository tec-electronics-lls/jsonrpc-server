const NATS = require('nats');

var NatsServer = function() {
    this._server;
    
    this.onRequest = function(input, callback) {
        callback(input);
    };
}



NatsServer.prototype.listen = function( channel, options, callback) {
    if (!callback) {
        callback = options;
        options = {
            url: 'nats://127.0.0.1:4222'
        };
    }
    
    if (typeof(options) === 'sting') {
        options = {
            url: options
        }
    }
    
    this._server = NATS.connect(options);

    if (callback) {
        
    }
    this._server.on('connect', ()=>{
        this._server.subscribe(channel, (input, responseChannel)=>{
            this.onRequest(input, (output)=>{
                output = output || '{}';
                this._server.publish(responseChannel, output);
            })
        });
        if (callback) {
            callback();
        }
    });
    
}

module.exports = NatsServer;