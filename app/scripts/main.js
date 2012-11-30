
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
}).on('click', 'a:not([data-bypass])', function(evt) {
  var href = $(this).attr('href');
  if (href && href.indexOf('#') === 0) {
    evt.preventDefault();
    Backbone.history.navigate(href, true);
  }
});


var canvas = document.getElementById('fft');
var ctx = canvas.getContext('2d');
canvas.width = document.body.clientWidth / 1.4;

const CANVAS_HEIGHT = canvas.height;
const CANVAS_WIDTH = canvas.width;

var red = document.querySelector('#chrome-logo .red');
var yellow = document.querySelector('#chrome-logo .yellow');
var green = document.querySelector('#chrome-logo .green');
var blue = document.querySelector('#chrome-logo .blue');

var spacer = document.getElementById('spacer-width');
var barWidth = document.getElementById('col-width');

function runCmd(el) {
  if (typeof el == 'string') {
    var func = el;
  } else {
    var func = el.dataset.func.toLowerCase();
  }
  sound[func]();
  el.disabled = !el.disabled;
  switch (func) {
    case 'play':
      document.querySelector("[data-func='stop']").disabled = false;
      break;
    case 'stop':
      document.querySelector("[data-func='play']").disabled = false;
      break;
    default:
      // noop
  }
}

function Sound() {
  const MIX_TO_MONO = false;
  const NUM_SAMPLES = 2048;

  var self_ = this;
  var context_ = new (window.AudioContext || window.webkitAudioContext)();
  var source_ = null;
  var jsProcessor_ = null;
  var analyser_ = null;
  var viewTimeDomain_ = false;

  var spacerWidth_ = spacer.valueAsNumber;
  var colWidth_ = barWidth.valueAsNumber;

  var viewportOffset_ = document.getElementById('viewport-offset');
  viewportOffset_.max = Math.round((NUM_SAMPLES / 2) - CANVAS_WIDTH / 4);
  viewportOffset_.value = Math.round(viewportOffset_.max / 4);

  document.getElementById('waveform').addEventListener('change', function(e) {
    viewTimeDomain_ = this.checked;
  }, false);

  document.getElementById('smoothing').addEventListener('change', function(e) {
    analyser_.smoothingTimeConstant = this.valueAsNumber;
  }, false);

  barWidth.addEventListener('change', function(e) {
    colWidth_ = this.valueAsNumber;
  }, false);

  spacer.addEventListener('change', function(e) {
    spacerWidth_ = this.valueAsNumber;
  }, false);

  document.getElementById('gain').addEventListener('change', function(e) {
    source_.gain.value = this.valueAsNumber;
    //ctx.fillStyle = 'rgb(0,0,' + this.valueAsNumber + ')';
  }, false);

  document.getElementById('playbackRate').addEventListener('change', function(e) {
    source_.playbackRate.value = this.valueAsNumber;
  }, false);

  /*document.getElementById('pitch').addEventListener('change', function(e) {
    var r = Math.random();
    var r1 = r1 = (r - 0.5) * 2.0;
    var totalPitch = document.getElementById('pitch').value + r1 * pitchRandomization;
    var pitchRate = Math.pow(2.0, totalPitch / 1200.0);
 console.log( source_.playbackRate, parseFloat(this.value), this.valueAsNumber)
    source_.playbackRate.value = this.valueAsNumber;
  }, false);*/

  var ftimer = 0;
  var bd = new BeatDetektor(75, 149);
  var vu = new BeatDetektor.modules.vis.VU();
  var portion = 0;
  var colors = [red, yellow, green];

  var processAudio_ = function(e) {

    // Get left channel input. No need for output arrays. They're hooked up
    // directly to the destination, and we're not doing any processing.
    var inputArrayL = e.inputBuffer.getChannelData(0);

    var freqByteData = new Uint8Array(analyser_.frequencyBinCount);

    if (viewTimeDomain_) {
      analyser_.getByteTimeDomainData(freqByteData);
    } else {
      analyser_.getByteFrequencyData(freqByteData);
      //analyser_.fftSize = 2048;
    }

    self_.renderFFT('canvas', freqByteData);
    };

  this.renderFFT = function(format, freqByteData) {
    if (format == 'canvas') {
      const SPACER_WIDTH = spacerWidth_;//colWidth_ + 1;
      const numBars = Math.round(CANVAS_WIDTH / SPACER_WIDTH);

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      freqByteData = freqByteData.subarray(viewportOffset_.valueAsNumber);

      var colors = [
        '#3369E8', // blue
        '#D53225', // red
        '#EEB211', // yellow
        '#009939' // green
      ];
      // Draw rectangle for each frequency bin.
      for (var i = 0; i < numBars /*freqByteData.length*/; ++i) {
        var magnitude = freqByteData[i];
        // if ((stageIndex % STAGES.length == 1) && transitionsDone) {
        //   var lingrad = ctx.createLinearGradient(0, CANVAS_HEIGHT, 0, CANVAS_HEIGHT - magnitude);
        //   lingrad.addColorStop(0, '#fff');
        //   lingrad.addColorStop(1, colors[i % colors.length]);
        //   ctx.fillStyle = lingrad;
        // }

        ctx.fillRect(i * SPACER_WIDTH, CANVAS_HEIGHT, colWidth_, -magnitude);
      }
    }
  };

  this.initAudio = function(arrayBuffer) {
    if (source_) {
      runCmd('stop');
    }

    source_ = context_.createBufferSource();
    source_.looping = true;

    // Use async decoder if it is available.
    if (context_.decodeAudioData) {
      context_.decodeAudioData(arrayBuffer, function(buffer) {
        source_.buffer = buffer;
      }, function(e) {
        console.log(e);
      });
    } else {
      source_.buffer = context_.createBuffer(arrayBuffer, MIX_TO_MONO /*mixToMono*/);
    }

    // This AudioNode will do the amplitude modulation effect directly in JavaScript
    jsProcessor_ = context_.createJavaScriptNode(NUM_SAMPLES /*bufferSize*/, 1 /*num inputs*/, 1 /*num outputs*/);
    jsProcessor_.onaudioprocess = processAudio_;

    analyser_ = context_.createAnalyser();
    analyser_.smoothingTimeConstant = document.getElementById('smoothing').valueAsNumber;

    source_.connect(context_.destination);

    //runCmd('play');
    document.querySelector("[data-func='play']").disabled = false;
  };

  this.load = function(url) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    request.onload = function(e) {
      self_.initAudio(request.response);
    };
    request.send();
  };

  this.play = function() {
    if (!source_) {
      sound.load('IO-5.0.wav');
    } else {
      // Connect the processing graph:
      // source -> destination
      // source -> analyser -> jsProcessor -> destination
      source_.connect(context_.destination);
      source_.connect(analyser_);

      analyser_.connect(jsProcessor_);
      jsProcessor_.connect(context_.destination);

      source_.noteOn(0);
    }
  };

  this.stop = function() {
    source_.noteOff(0);
    source_.disconnect(0);
    jsProcessor_.disconnect(0);
    analyser_.disconnect(0);

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  };
}

var sound = new Sound();
sound.load('/scripts/IO-5.0.mp3');
