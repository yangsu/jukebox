(function (Backbone, audio, window, _) {
  var urlError = function () {
    throw new Error('A "url" property or function must be specified');
  };

  var contextError = function () {
    throw new Error('A "context" property or function must be specified');
  };

  var createGain = function (context, value) {
    var gain = context.createGainNode();
    // Default amplitude = 1
    gain.gain.value = value || 1;
    return gain;
  };

  audio.Models.TrackModel = Backbone.Model.extend({
    initialize: function (options) {
      var self = this
        , context = self.get('context');
      if (context) {
        var masterGain = createGain(context);
        masterGain.connect(context.destination);

        var sourceGain = createGain(context, window.Constants.SOURCE_AMP);
        sourceGain.connect(masterGain);

        // src? --> sourceGain --> masterGain --> output
        self.set({
          masterGain: masterGain,
          sourceGain: sourceGain,
          destination: masterGain,
          generators: []
        })
        .addSourceFilter({
          type: 0, // LOWPASS
          threshold: window.Constants.FILTER
        });

        var generatorAmp = (1 - window.Constants.SOURCE_AMP)/window.Constants.EMBED.length;

        _.each(window.Constants.EMBED, function (embedFreq) {
          self.addGenerator({
            type: window.DSP.SINE,
            frequency: embedFreq,
            // frequency: window.Constants.FILTER,
            amplitude: generatorAmp,
            bufferSize: window.Constants.BUFFER_SIZE,
            sampleRate: window.Constants.SAMPLE_RATE
          });
        });
      }
    },
    fetch: function (options) {
      var model = this
        , url = options.url || model.get('url') || urlError()
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

              model.setSource(buffer);

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
    setSource: function (buffer) {
      var source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = false;
      source.connect(this.get('sourceFilter'));
      this.set({
        source: source
      });
      return this;
    },
    // Gains
    setGain: function (gainNode, value) {
      if (this.get(gainNode)) {
        this.get(gainNode).gain.value = value;
      }
      return this;
    },
    setMasterVolume: function (value) {
      return this.setGain('masterGain', value);
    },
    setSourceVolume: function (value) {
      return this.setGain('sourceGain', value);
    },
    // Filters
    addSourceFilter: function (options) {
      if (this.get('sourceGain')) {
        var sourceFilter = this.get('context').createBiquadFilter();
        sourceFilter.type = options.type;
        sourceFilter.frequency.value = options.threshold;
        sourceFilter.Q.value = options.quality || 30;

        sourceFilter.connect(this.get('sourceGain'));
        this.set('sourceFilter', sourceFilter);
      }
      return this;
    },
    disconnectFilter: function (delay) {
      if (this.get('destination') && this.get('source') && this.get('sourceFilter')) {
        this.get('sourceFilter').disconnect(delay || 0);
        this.get('source').connect(this.get('destination'));
      }
      return this;
    },
    setFilterFrequency: function (value) {
      if (this.get('sourceFilter')) {
        this.get('sourceFilter').frequency.value = value;
      }
    },
    // Generators
    addGenerator: function (options) {
      var context = this.get('context');
      if (context) {
        var signal = window.generateOscillator(options)
          , generatorSource = context.createBufferSource();

        generatorSource.buffer = context.createBuffer(
          window.Constants.CHANNELS,
          window.Constants.BUFFER_SIZE,
          window.Constants.SAMPLE_RATE
        );

        _.each(_.range(0, window.Constants.CHANNELS), function (channel) {
          generatorSource.buffer.getChannelData(channel).set(signal);
        });

        generatorSource.looping = options.looping || true;

        generatorSource.connect(this.get('destination'));

        this.get('generators').push(generatorSource);
      }
      return this;
    },
    genAction: function (action, delay) {
      var generators = this.get('generators');
      if (this.get('source') && generators && generators.length) {
        delay = delay || 0;
        this.get('source')[action](delay);
        _.each(generators, function (generator) {
          generator[action](delay);
        });
      }
      return this;
    },
    play: function (delay) {
      return this.genAction('noteOn', delay);
    },
    stop: function (delay) {
      return this.genAction('noteOff', delay);
    }
  });
})(Backbone, audio, window, _);