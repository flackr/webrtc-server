const webrtcConnection = require('./webrtc-connection.js');
const EchoServer = require('./servers/echo-server.js');

var http = require('http');
var https = require('https');
var WebSocketServer = require('ws').Server;
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');

exports.Server = function() {

  async function establishDataChannelThen(ws, callback) {
    callback(await webrtcConnection.establish(ws, {offer: true}));
  }

  function connectWebsockets(ws1, ws2) {
    ws1.addEventListener('message', function(evt) {
      ws2.send(evt.data);
    });
    ws2.addEventListener('message', function(evt) {
      ws1.send(evt.data);
    });
    ws1.addEventListener('close', function() {
      ws2.close();
    });
    ws2.addEventListener('close', function() {
      ws1.close();
    });
  }

  class Server {
    constructor() {
      this.webServer_ = null;
      this.webSocketServer_ = null;
      this.listeners_ = {};
      this.serve = serveStatic(((__dirname + '/') || '') + './');
    }

    listen(options) {
      options.port = options.port || process.env.PORT || (options.key ? 443 : 80);
      if (options.key)
        this.webServer_ = https.createServer(options, this.onRequest.bind(this));
      else
        this.webServer_ = http.createServer(this.onRequest.bind(this));
      this.webSocketServer_ = new WebSocketServer({'server': this.webServer_});
      this.webSocketServer_.on('connection', this.onConnection.bind(this));
      this.webServer_.listen(options.port);
      console.log('Listening on ' + options.port);
    }

    onRequest(req, res) {
      // Default handler.
      var done = finalhandler(req, res);
      this.serve(req, res, done);
    }

    /**
     * Dispatched when a client connects to a websocket.
     *
     * @param {WebSocket} websocket A connected websocket client connection.
     * @param {Object?} req The request object. May be undefined on older node.
     */
    onConnection(websocket, req) {
      req = req || websocket.upgradeReq;
      var origin = req.origin || 'unknown';
      if (req.url == '/chat') {
        // TODO: implement chat server.
        console.log('chat requested');
      } else if (req.url == '/echo') {
        establishDataChannelThen(websocket, EchoServer.accept);
      } else if (req.url == '/echo-websocket') {
        EchoServer.accept(websocket);
      } else if (req.url.startsWith('/listen/')) {
        let name = req.url.split('/')[2];
        if (this.listeners_[name]) {
          // Don't allow duplicate listeners on the same name.
          websocket.close();
          return;
        }
        this.listeners_[name] = websocket;
        this.listeners_.onclose = this.onWebsocketClose.bind(this, name);
      } else if (req.url.startsWith('/connect/')) {
        let name = req.url.split('/')[2];
        if (!this.listeners_[name]) {
          websocket.close();
          return;
        }
        this.listeners_[name].onclose = undefined;
        this.listeners_[name].send('connected');
        connectWebsockets(websocket, this.listeners_[name]);
        delete this.listeners_[name];
      } else {
        websocket.close();
      }
    }

    onWebsocketClose(name) {
      delete this.listeners_[name];
    }

    /**
     * Shuts down the signaling server.
     */
    shutdown() {
      this.webSocketServer_.close();
    }

  };

  return Server;
}();

if (require.main === module) {
  let server = new exports.Server();
  server.listen({});
}