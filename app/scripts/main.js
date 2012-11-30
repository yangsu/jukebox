
window.audio = {
  Models: {},
  Collections: {},
  Views: {},
  Routers: {},
  init: function() {
    console.log('Hello from Backbone!');
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
      dancerInst.play();
    });


}).on('click', 'a:not([data-bypass])', function(evt) {
  var href = $(this).attr('href');
  if (href && href.indexOf('#') === 0) {
    evt.preventDefault();
    Backbone.history.navigate(href, true);
  }
});
