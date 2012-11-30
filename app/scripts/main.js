
window.Constants = {
  FREQ_MUL: 7000,
  QUAL_MUL: 30,
  CHANNELS: 1,
  BUFFER_SIZE: 65536,
  SAMPLE_RATE: 44100,
  FILTER: 18500,
  // EMBED: [18500, 19170],
  EMBED: [400],
  SOURCE_AMP: 0.8,
  PREVIEW_LENGTH: 10
};
window.Constants.GEN_AMP = (1 - window.Constants.SOURCE_AMP)/window.Constants.EMBED.length;

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
  Templates: {},
  init: function() {
    console.log('Hello from Backbone!');
    window.context = new webkitAudioContext();

    var socket = io.connect('http://djbox.fm:80');
    //var socket = io.connect('http://localhost');
    socket
      .on('new_jukebox', function (data) {
        window.Constants.EMBED = [data.frequency];
        window.Constants.jbid = data.jbid;

        var model = new audio.Models.ApplicationModel({
          context: context
        });

        var view = new audio.Views.ApplicationView({
          el: '#jukebox',
          model: model,
          context: context
        });

        var tracks = new audio.Collections.TrackCollection(data.songs);
        var tracksView = new audio.Views.TracksView({
          el: '#tracks',
          model: tracks
        }).constructSubviews().render();

        tracks.fetchTrackStreams({
          success: function () {
            console.log('fetched all');
          }
        });

        model.setTracks(tracks);

        model.switchSong(0);

        window.audio.view = view;
        window.audio.model = model;

        console.log('New Jukebox', data);
      })
      .on('play_song', function (data) {
        if (data.jbid == window.Constants.jbid) {
          audio.model.switchSong(data.sid, null, function () {
            audio.model.play();
          });
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
  $('body').css('height', $(window).height() + 'px');
  audio.init();

}).on('click', 'a:not([data-bypass])', function(evt) {
  var href = $(this).attr('href');
  if (href && href.indexOf('#') === 0) {
    evt.preventDefault();
    Backbone.history.navigate(href, true);
  }
});
