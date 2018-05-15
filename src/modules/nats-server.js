const NATS = require('nats');

var NatsServer = function() {
    this._server;
    
    this.onRequest = function(input, callback) {
        callback(input);
    };
}



NatsServer.prototype.listen = function(options, channel) {
    this._server = NATS.connect(options);

    this._server.subscribe(channel, (input, responseChannel)=>{
        this.onRequest(input, (output)=>{
            output = output || '{}';
            this._server.publish(responseChannel, output);
        })
    });
}

module.exports = NatsServer;