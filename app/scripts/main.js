
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
      context: context
    });
    model.fetch({
      success: function (trackModel) {
        console.log(arguments);
        trackModel.play();
      }
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

  window.dancerInst = new Dancer(),
    canvas = document.getElementById('fftcanvas');
  dancerInst.fft( canvas, {
      width: 2,
      spacing: 1,
      fillStyle: "black"
    });
  dancerInst
    .bind('progress', function (e) {
      console.log(arguments);
    })
    .bind('update', function () {
    })
    .load(document.getElementById('music'))
    .bind('loaded', function () {
      // dancerInst.play();
    });

  window.FilterSample = {
    FREQ_MUL: 7000,
    QUAL_MUL: 30,
    playing: false
  };

  FilterSample.play = function() {
    // Create the source.
    var source = context.createBufferSource();
    source.buffer = BUFFERS.techno;
    // Create the filter.
    var filter = context.createBiquadFilter();
    filter.type = 0; // LOWPASS
    filter.frequency.value = 5000;
    // Connect source to filter, filter to destination.
    source.connect(filter);
    filter.connect(context.destination);
    // Play!
    source.noteOn(0);
    source.loop = true;
    // Save source and filterNode for later access.
    this.source = source;
    this.filter = filter;
  };

  FilterSample.stop = function() {
    this.source.noteOff(0);
  };

  FilterSample.toggle = function() {
    this.playing ? this.stop() : this.play();
    this.playing = !this.playing;
  };

  FilterSample.changeFrequency = function(element) {
    // Clamp the frequency between the minimum value (40 Hz) and half of the
    // sampling rate.
    var minValue = 40;
    var maxValue = context.sampleRate / 2;
    // Logarithm (base 2) to compute how many octaves fall in the range.
    var numberOfOctaves = Math.log(maxValue / minValue) / Math.LN2;
    // Compute a multiplier from 0 to 1 based on an exponential scale.
    var multiplier = Math.pow(2, numberOfOctaves * (element.value - 1.0));
    // Get back to the frequency value between min and max.
    this.filter.frequency.value = maxValue * multiplier;
  };

  FilterSample.changeQuality = function(element) {
    this.filter.Q.value = element.value * this.QUAL_MUL;
  };

  FilterSample.toggleFilter = function(element) {
    this.source.disconnect(0);
    this.filter.disconnect(0);
    // Check if we want to enable the filter.
    if (element.checked) {
      // Connect through the filter.
      this.source.connect(this.filter);
      this.filter.connect(context.destination);
    } else {
      // Otherwise, connect directly.
      this.source.connect(context.destination);
    }
  };

}).on('click', 'a:not([data-bypass])', function(evt) {
  var href = $(this).attr('href');
  if (href && href.indexOf('#') === 0) {
    evt.preventDefault();
    Backbone.history.navigate(href, true);
  }
});
