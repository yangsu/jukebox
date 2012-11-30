(function (Backbone, audio, window, _) {
  var urlError = function () {
    throw new Error('A "url" property or function must be specified');
  };

  var contextError = function () {
    throw new Error('A "context" property or function must be specified');
  };

  audio.Models.TrackModel = Backbone.Model.extend({
    fetch: function (options) {
      var model = this
        , url = model.get('url') || urlError()
        , context = model.get('context') || contextError();

      options = options || {};

      options.error = Backbone.wrapError(options.error, model, options);

      // Load buffer asynchronously
      var request = new XMLHttpRequest();
      request.open("GET", url, true);
      request.responseType = "arraybuffer";

      request.onload = function(resp, status, xhr) {
        if (context) {
          context.decodeAudioData(
            request.response,
            function(buffer) {
              if (!buffer) {
                console.log('error decoding file data: ' + url);
                options.error && options.error();
              }

              var source = context.createBufferSource();
              source.buffer = buffer;
              source.connect(context.destination);

              model.set({
                source: source
              });

              if (options.success) options.success(model, resp);
            },
            options.error
          );
        } else {
          console.log('must have a context');
          options.error && options.error();
        }
      };

      request.onerror = options.error;

      request.send();

    },
    play: function (delay) {
      delay = delay || 0;
      var source = this.get('source');
      if (source) {
        source.noteOn(delay);
      }
    },
    stop: function (delay) {
      delay = delay || 0;
      var source = this.get('source');
      if (source) {
        source.noteOff(delay);
      }
    }
  });
})(Backbone, audio, window, _);