
window.Constants = {
  FREQ_MUL: 7000,
  QUAL_MUL: 30,
  CHANNELS: 1,
  BUFFER_SIZE: 65536,
  SAMPLE_RATE: 44100,
  FILTER: 17000,
  playing: false
};

window.generateOscillator = function (options) {
  return new Oscillator(
    options.type,
    options.frequency,
    options.amplitude,
    options.bufferSize,
    options.sampleRate
  ).generate();
};

window.audio = {
  Models: {},
  Collections: {},
  Views: {},
  Routers: {},
  init: function() {
    console.log('Hello from Backbone!');
    window.context = new webkitAudioContext();

    var model = new audio.Models.TrackModel({
      url: '/audio/IO-5.0.ogg',
      // url: 'http://www.djbox.fm/api/stream/293',
      context: context
    });
    model.fetch({
      sourceOptions: {
        loop: true
      },
      success: function (trackModel) {
        console.log(arguments);

        var filter = context.createBiquadFilter();
        filter.type = 0; // LOWPASS
        filter.frequency.value = Constants.FILTER;
        filter.Q.value = 30;

        trackModel.addFilter(filter)
        .setVolume(0.8);

        var sine = window.generateOscillator({
          type: DSP.SINE,
          frequency: 18500,
          // frequency: Constants.FILTER,
          amplitude: 0.1,
          bufferSize: Constants.BUFFER_SIZE,
          sampleRate: Constants.SAMPLE_RATE
        });

        var src = context.createBufferSource();
        src.buffer = context.createBuffer(Constants.CHANNELS, Constants.BUFFER_SIZE, Constants.SAMPLE_RATE);
        src.buffer.getChannelData(0).set(sine);
        // src.buffer.getChannelData(1).set(sine);
        src.looping = true;

        // src.connect(trackModel.get('destination'));
        src.connect(context.destination);

        var sine2 = window.generateOscillator({
          type: DSP.SINE,
          frequency: 19170,
          // frequency: Constants.FILTER,
          amplitude: 0.1,
          bufferSize: Constants.BUFFER_SIZE,
          sampleRate: Constants.SAMPLE_RATE
        });

        var src2 = context.createBufferSource();
        src2.buffer = context.createBuffer(Constants.CHANNELS, Constants.BUFFER_SIZE, Constants.SAMPLE_RATE);
        src2.buffer.getChannelData(0).set(sine2);
        // src2.buffer.getChannelData(1).set(sine2);
        src2.looping = true;

        // src2.connect(trackModel.get('destination'));
        src2.connect(context.destination);

        src.noteOn(0);
        src2.noteOn(0);

        trackModel.play();
      }
    });

    $('#filter').change(function(e) {
      var element = e.target;
      // Clamp the frequency between the minimum value (40 Hz) and half of the
      // sampling rate.
      var minValue = 20;
      var maxValue = context.sampleRate / 2;
      // Logarithm (base 2) to compute how many octaves fall in the range.
      var numberOfOctaves = Math.log(maxValue / minValue) / Math.LN2;
      // Compute a multiplier from 0 to 1 based on an exponential scale.
      var multiplier = Math.pow(2, numberOfOctaves * (element.value - 1.0));
      // Get back to the frequency value between min and max.
      model.setFilterFrequency(maxValue * multiplier);
    });
    $('#volume').change(function(e) {
      model.setVolume(e.target.value);
    });
  },
  template: function (templateName) {
    var path = 'scripts/templates/' + templateName + '.ejs';

    return function (context) {
      if (!audio.Templates[path]) {
        $.ajax({ url: path, async: false }).then(function(contents) {
          audio.Templates[path] = _.template(contents);
        });
      }
      return audio.Templates[path](context);
    };
  }
};

$(document).ready(function(){
  audio.init();

  Dancer.setOptions({
    flashSWF : '/scripts/vendor/soundmanager2.swf',
    flashJS  : '/scripts/vendor/soundmanager2.js'
    // flashJS  : '/scripts/vendor/soundmanager2.min.js'
  });

  // window.dancerInst = new Dancer(),
  //   canvas = document.getElementById('fftcanvas');
  // dancerInst.fft( canvas, {
  //     width: 2,
  //     spacing: 1,
  //     fillStyle: "black"
  //   });
  // dancerInst
  //   .bind('progress', function (e) {
  //     console.log(arguments);
  //   })
  //   .bind('update', function () {
  //   })
  //   .load(document.getElementById('music'))
  //   .bind('loaded', function () {
  //     // dancerInst.play();
  //   });

}).on('click', 'a:not([data-bypass])', function(evt) {
  var href = $(this).attr('href');
  if (href && href.indexOf('#') === 0) {
    evt.preventDefault();
    Backbone.history.navigate(href, true);
  }
});
