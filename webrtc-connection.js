//
// # Runs a server with support for accepting webrtc connections.
//

if (typeof exports !== 'undefined') {
  const wrtc = require('wrtc');
  this.RTCPeerConnection = wrtc.RTCPeerConnection;
  this.RTCSessionDescription = wrtc.RTCSessionDescription;
  this.RTCIceCandidate = wrtc.RTCIceCandidate;
}

(function(exports, scope) {

  const RTCPeerConnection = scope.RTCPeerConnection || scope.webkitRTCPeerConnection || scope.mozRTCPeerConnection;
  const RTCSessionDescription = scope.RTCSessionDescription || scope.webkitRTCSessionDescription || scope.mozRTCSessionDescription;
  const RTCIceCandidate = scope.RTCIceCandidate || scope.webkitRTCIceCandidate || scope.mozRTCIceCandidate;

  /**
   * Establish a WebRTC connection over the given WebSocket connection.
   *
   * @param {WebSocket} |websocket| The websocket connection to negotiate a new
   *     WebRTC connection over.
   * @param {Object} |options| The configuration options for the WebRTC
   *     connection.
   */
  async function establish(websocket, options) {
    return new Promise(function(accept, reject) {
      console.log('working');
      let rtcConnection = new RTCPeerConnection(options && options.configuration ||
          {iceServers: [
              {urls: "stun:stun.l.google.com:19302"},
          ]});
      let dataChannel = undefined;
      // TODO: Allow specifying multiple datachannels.
      if (options && options.offer) {
        ondatachannel(rtcConnection.createDataChannel('data',
            options && options.dataChannelOptions || {
                ordered: false, maxRetransmits: 0}));
      }
      function cleanup() {
        websocket.removeEventListener('message', onmessage);
        websocket.close();
        rtcConnection.ondatachannel = rtcConnection.onicecandidate =
            rtcConnection.onIceConnectionStateChange = undefined;
        if (dataChannel)
          dataChannel.onopen = undefined;
      }
      function fail(e) {
        cleanup();
        reject();
      }
      function ondatachannel(channel) {
        dataChannel = channel;
        if (dataChannel.readyState == 'open') {
          cleanup();
          // TODO(flackr): Send rtcConnection as well.
          accept(dataChannel);
        } else {
          dataChannel.onopen = function() {
            cleanup();
            accept(dataChannel);
          }
        }
      }
      function onmessage(evt) {
        let data = JSON.parse(evt.data);
        if (data.type == 'offer' || data.type == 'answer')
          rtcConnection.setRemoteDescription(new RTCSessionDescription(data.value));
        if (data.type == 'offer') {
          rtcConnection.createAnswer(function(desc) {
            rtcConnection.setLocalDescription(desc);
            websocket.send(JSON.stringify({
                'type': 'answer',
                'value': desc}));
          }, fail);
        } else if (data.type == 'candidate') {
          rtcConnection.addIceCandidate(new RTCIceCandidate(data.value));
        }
      }
      rtcConnection.ondatachannel = function(evt) {
        ondatachannel(evt.channel);
      };
      rtcConnection.onicecandidate = function(evt) {
        if (!evt.candidate) return;
        websocket.send(JSON.stringify({type: 'candidate', value: evt.candidate}));
      };
      rtcConnection.onIceConnectionStateChange = function() {
        if (rtcConnection.iceConnectionState == 'disconnected') {
          fail();
        }
      };
      websocket.addEventListener('message', onmessage);
      if (options && options.offer) {
        rtcConnection.createOffer(function(desc) {
          rtcConnection.setLocalDescription(desc);
          websocket.send(JSON.stringify({
              'type': 'offer',
              'value': desc}));
        }, fail);
      }
    });
  }

  exports.establish = establish;
})(typeof exports === 'undefined' ? this['WebRTCConnection'] = {} : exports, this);
