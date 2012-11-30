(function (Backbone, audio, window, _) {
  var urlError = function () {
    throw new Error('A "url" property or function must be specified');
  };

  var contextError = function () {
    throw new Error('A "context" property or function must be specified');
  };

  audio.Models.TrackModel = Backbone.Model.extend({
    initialize: function (options) {
      this.set('destination', this.get('context').destination);
    },
    fetch: function (options) {
      var model = this
        , url = model.get('url') || urlError()
        , context = model.get('context') || contextError()
        , destination = model.get('destination');

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

              _.each(options.sourceOptions, function (value, key) {
                source[key] = value;
              });

              var gain = context.createGainNode();

              source.connect(gain);
              gain.connect(destination);

              model.set({
                source: source,
                gain: gain,
                destination: gain
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
    setVolume: function (value) {
      if (this.get('gain')) {
        this.get('gain').gain.value = value;
      }
      return this;
    },
    addFilter: function (filter) {
      if (this.get('destination') && this.get('source')) {
        this.get('source').disconnect(0);
        this.get('source').connect(filter);
        filter.connect(this.get('destination'));
        this.set('filter', filter);
      }
      return this;
    },
    disconnectFilter: function (delay) {
      delay = delay || 0;
      if (this.get('destination') && this.get('source') && this.get('filter')) {
        this.get('filter').disconnect(delay);
        this.get('source').connect(this.get('destination'));
      }
      return this;
    },
    setFilterFrequency: function (value) {
      if (this.get('filter')) {
        this.get('filter').frequency.value = value;
      }
    },
    play: function (delay) {
      delay = delay || 0;
      var source = this.get('source');
      if (source) {
        source.noteOn(delay);
      }
      return this;
    },
    stop: function (delay) {
      delay = delay || 0;
      var source = this.get('source');
      if (source) {
        source.noteOff(delay);
      }
      return this;
    }
  });
})(Backbone, audio, window, _);