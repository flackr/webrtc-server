(function(exports, scope) {

  function accept(sourceSocket) {
    sourceSocket.addEventListener('message', function(evt) {
      sourceSocket.send(evt.data);
    })
  }

  exports.accept = accept;
})(typeof exports === 'undefined' ? this['EchoServer'] = {} : exports, this);