if (typeof exports !== 'undefined') {
this.performance = require('perf_hooks').performance;
}

(function(exports, scope) {

  function accept(sourceSocket) {
    let lastMessage = undefined;
    let timeDelta = undefined;
    let skipped = 0;
    const GARBAGE_SEPARATOR = '{(})';
    sourceSocket.addEventListener('message', function(evt) {
      let garbage_start = evt.data.indexOf(GARBAGE_SEPARATOR);
      let data = JSON.parse(evt.data.substring(0, garbage_start));
      // Only reply to messages in order
      if (lastMessage && lastMessage.i > data.i) {
        skipped++;
        return;
      }
      let serverNow = scope.performance.now();
      if (!timeDelta)
        timeDelta = data.time - serverNow;
      data.serverTime = serverNow + timeDelta;
      data.skipped = skipped;
      sourceSocket.send(JSON.stringify(data) + evt.data.substring(garbage_start));
      lastMessage = data;
    })
  }

  exports.accept = accept;
})(typeof exports === 'undefined' ? this['EchoServer'] = {} : exports, this);