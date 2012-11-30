
window.FilterSample = {
  FREQ_MUL: 7000,
  QUAL_MUL: 30,
  playing: false
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
        filter.frequency.value = 48000;
        filter.Q.value = 30;

        trackModel
          .addFilter(filter)
          .play();
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
