audio.Views.ApplicationView = Backbone.View.extend({

  template: audio.template('application'),
  initialize: function () {
    this.model
      .on('progress', this.updateProgressBar, this)
      .on('seek', this.updateSeek, this)
      .on('loaded', this.onLoad, this)
      // .on('sync', this.render, this)
      .on('fft', this.renderFFT, this)
    ;

    this.render();
    var canvas = document.getElementById('fftcanvas');
    this.$canvas = $(canvas);
    this.ctx = canvas.getContext('2d');

    this.CANVAS_HEIGHT = canvas.height;
    this.CANVAS_WIDTH = canvas.width;
  },
  events: {
    'click #play': 'onPlay',
    'click #pause': 'onPause',
    'click #stop': 'onStop',
    'click #next': 'onNext',
    'click #previous': 'onPrevious',
    'change #filter': 'onFilterChange',
    'change #volume': 'onVolumeChange'
  },
  onLoad: function () {
    this.$('#play').removeAttr('disabled');
  },
  onPlay: function () {
    this.$('#pause, #stop').removeAttr('disabled');
    this.$('#play').attr('disabled', 'disabled');
    this.model.play();
  },
  onPause: function () {
    this.$('#play').removeAttr('disabled');
    this.model.pause();
  },
  onStop: function () {
    this.$('#pause, #stop').attr('disabled', 'disabled');
    this.$('#play').removeAttr('disabled');
    this.model.stop();
  },
  onNext: function () {

  },
  onPrevious: function () {

  },
  onFilterChange: function (e) {
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
    this.model.setFilterFrequency(maxValue * multiplier);
  },
  onVolumeChange: function (e) {
    this.model.setMasterVolume(e.target.value);
  },
  updateProgressBar: function (progressPercentage) {
    this.$('#progress').val(progressPercentage).trigger('change');
  },
  updateSeek: function (seekPosition, duration) {
    var $seek = this.$('#seek');
    $seek.data('rangeMax', duration);
    $seek.val((isNaN(seekPosition) ? 0 : seekPosition )/duration);
    $seek.trigger('change');
  },
  renderFFT: function (freqByteData) {
    var
      ctx     = this.ctx,
      h       = this.CANVAS_HEIGHT,
      w       = this.CANVAS_WIDTH,
      // count   = 512,
      count   = 32,
      spacing = 1,
      width   = w/count - spacing,
      binSize = freqByteData.length / count,
      max = 5000;

    freqByteData = _.chain(freqByteData)
      .groupBy(function (value, i) {
        return Math.floor(i/binSize);
      })
      .map(function (bin) {
        return _.reduce(bin, function(memo, num){ return memo + num; }, 0);
      })
      .value();

    ctx.clearRect( 0, 0, w, h );

    // ctx.fillStyle = "#ffffff88";
    var lingrad = ctx.createLinearGradient(0, h, 0, 1);
    lingrad.addColorStop(0, '#BBB');
    lingrad.addColorStop(1, '#000');
    ctx.fillStyle = lingrad;

    for ( var i = 0; i < count; i++ ) {
      ctx.fillRect( i * ( spacing + width ), h, width, Math.floor(-freqByteData[ i ] * h/ (max * width)) * width );
      // ctx.fillRect( i * ( spacing + width ), h, width, -freqByteData[ i ] /max * h);
    }

    for ( var i = 0, l = h/width; i < l; i++ ) {
      ctx.clearRect(0, i*width, w, spacing)
    }

  },
  render: function () {
    this.$el.html(this.template(this.model.toJSON()));
    this.$('.dial').knob({
      draw: renderRing
    });
    return this;
  }

});

var convert = function (pos, max) {
  if (_.isNaN(pos)) {
    return '0:00';
  } else {
    pos = max*pos;
    return Math.floor(pos/60) + ':' + ('0'+Math.floor(pos%60).toString()).substring(-2);
  }
};

var renderRing = function (argument) {
  this.i.val(convert(this.$.val(), parseInt(this.$.data('rangeMax'))));
};