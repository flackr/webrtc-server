const webrtcConnection = require('./webrtc-connection.js');

var http = require('http');
var https = require('https');
var WebSocketServer = require('ws').Server;
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');

exports.Server = function() {

  async function acceptEchoServer(ws) {
    let conn = await webrtcConnection.establish(ws, {offer: true});
    conn.addEventListener('message', function(evt) {
      conn.send(evt.data);
    });
  }

  var Server = function() {
    this.webServer_ = null;
    this.webSocketServer_ = null;
    this.serve = serveStatic('./');
  };

  Server.prototype = {

    listen: function(options) {
      options.port = options.port || process.env.PORT || (options.key ? 443 : 80);
      if (options.key)
        this.webServer_ = https.createServer(options, this.onRequest.bind(this));
      else
        this.webServer_ = http.createServer(this.onRequest.bind(this));
      this.webSocketServer_ = new WebSocketServer({'server': this.webServer_});
      this.webSocketServer_.on('connection', this.onConnection.bind(this));
      this.webServer_.listen(options.port);
      console.log('Listening on ' + options.port);
    },

    onRequest: function(req, res) {
      // Default handler.
      var done = finalhandler(req, res);
      this.serve(req, res, done);
    },

    /**
     * Dispatched when a client connects to a websocket.
     *
     * @param {WebSocket} websocket A connected websocket client connection.
     * @param {Object?} req The request object. May be undefined on older node.
     */
    onConnection: function(websocket, req) {
      req = req || websocket.upgradeReq;
      var origin = req.origin || 'unknown';
      if (req.url == '/chat') {
        // TODO: implement chat server.
        console.log('chat requested');
      }
      acceptEchoServer(websocket);
    },

    /**
     * Shuts down the signaling server.
     */
    shutdown: function() {
      this.webSocketServer_.close();
    },

  };

  return Server;
}();

let server = new exports.Server();
server.listen({});