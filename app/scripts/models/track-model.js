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

        // sourceGain --> masterGain --> output
        self.set({
          masterGain: masterGain,
          sourceGain: sourceGain,
          generators: []
        })
        .addSourceFilter({
          type: 0, // LOWPASS
          threshold: window.Constants.FILTER
        })
        .addGenerators();



        var procNode = context.createScriptProcessor(2048,1,1);
        procNode.onaudioprocess = function (e) {
          console.log(e);
          // var output = e.outputBuffer.getChannelData(0);
          // for (var i = 0; i < output.length; i++) {
          //   output[i] = Math.random();
          //   // Math.random() sends random numbers, but you can make
          //   // that be anything you want
          // }
        }
      }
    },
    fetch: function (options) {
      var model = this
        , url = options.url || model.get('url') || urlError()
        , context = model.get('context') || contextError();

      options = options || {};

      options.error = Backbone.wrapError(options.error, model, options);

      // Load buffer asynchronously
      var request = new XMLHttpRequest();
      request.open("GET", url, true);
      request.responseType = "arraybuffer";

      request.onprogress = function (evt) {
        if (evt.lengthComputable) {
          var percentComplete = (evt.loaded / evt.total)*100;
          model.trigger('progress', percentComplete);
        }
      };
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
              model.trigger('loaded');

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
    // Getters
    getLength: function () {
      var source = this.get('source');
      return source && source.buffer && source.buffer.duration;
    },
    getCurrentTime: function () {
      var source = this.get('source')
        , currentTime = source && source.context && source.context.currentTime;
      return currentTime;
    },
    // Setters
    setSource: function (buffer) {
      var source = this.get('source');
      if (source) {
        source.noteOff(0);
        source.disconnect(0);
        this.unset('source');
      }
      source = this.get('context').createBufferSource();
      source.loop = false;
      source.buffer = buffer;
      // src --> sourceFilter --> sourceGain --> masterGain --> output
      source.connect(this.get('sourceFilter'));
      this.set({
        buffer: buffer,
        source: source
      });
      return this;
    },
    addGenerators: function () {
      if (this.get('generators')) {
        _.each(this.get('generators'), function (generator) {
          generator.disconnect(0);
        });
        this.set('generators', []);
      }
      var self = this;
      _.each(window.Constants.EMBED, function (embedFreq) {
        self.addGenerator({
          type: window.DSP.SINE,
          frequency: embedFreq,
          // frequency: window.Constants.FILTER,
          amplitude: window.Constants.GEN_AMP,
          bufferSize: window.Constants.BUFFER_SIZE,
          sampleRate: window.Constants.SAMPLE_RATE
        });
      });
      return this;
    },
    reconstruct: function () {
      var context = this.get('context');
      this.setSource(this.get('buffer'));
      this.addGenerators();
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
        // sourceFilter --> sourceGain --> masterGain --> output
        sourceFilter.connect(this.get('sourceGain'));
        this.set('sourceFilter', sourceFilter);
      }
      return this;
    },
    disconnectFilter: function (delay) {
      if (this.get('source') && this.get('sourceGain') && this.get('sourceFilter')) {
        this.get('sourceFilter').disconnect(delay || 0);
        this.get('source').connect(this.get('sourceGain'));
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

        generatorSource.loop = options.loop || true;

        //generator --> masterGain --> output
        generatorSource.connect(this.get('masterGain'));

        this.get('generators').push(generatorSource);
      }
      return this;
    },
    // Commands
    genAction: function (action, delay, offset, duration) {
      var generators = this.get('generators')
        , sourceAction = (action == 'noteOn' && offset) ? 'noteGrainOn' : action;
      if (this.get('source') && generators && generators.length) {
        delay = delay || 0;
        this.get('source')[sourceAction](delay, offset || 0, this.get('buffer').duration - offset);
        _.each(generators, function (generator) {
          generator[action](delay);
        });
      }
      return this;
    },
    play: function (delay, offset, duration) {
      if (this.get('stopped') === true) {
        this.set('stopped', false);
        this.reconstruct();
      }
      return this.genAction('noteOn', delay, this.lastLocation || 0);
    },
    pause: function (delay) {
      this.lastLocation = this.getCurrentTime();

      this.set('stopped', true);
      return this.genAction('noteOff', delay);
    },
    stop: function (delay) {
      this.lastLocation = 0;
      this.set('stopped', true);
      return this.genAction('noteOff', delay);
    }
  });
})(Backbone, audio, window, _);