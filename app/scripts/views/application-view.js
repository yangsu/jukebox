audio.Views.ApplicationView = Backbone.View.extend({

  template: audio.template('application'),
  trackTemplate: audio.template('track'),
  initialize: function () {
    this.model
      // .on('progress', this.updateProgressBar, this)
      .on('seek', this.updateSeek, this)
      .on('loadedAllTracks', this.onLoad, this)
      // .on('sync', this.render, this)
      .on('fft', this.renderFFT, this)
      .on('switchSong', this.renderSongTransition, this)
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
    'click #prev': 'onPrevious',
    'change #filter': 'onFilterChange',
    'change #volume': 'onVolumeChange'
  },
  onLoad: function () {
    this.$('#play').removeAttr('disabled');
    this.$('.loader').fadeOut('slow');
    this.model.switchSong(0);
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
    var l = this.model.get('tracks').length;
    var rand = Math.floor(Math.random() * l);
    this.model.switchSong(((this.model.get('currentIndex') + 1)|| rand)%l);
  },
  onPrevious: function () {
    var l = this.model.get('tracks').length;
    var rand = Math.floor(Math.random() * l);
    this.model.switchSong(((this.model.get('currentIndex') - 1)|| rand)%l);
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
  renderSongTransition: function (newTrack) {
    this.$('#currentTrack').html(this.trackTemplate(newTrack.toJSON()));
    this.$('#panel > div:nth-child(2) > canvas').css({
      background: newTrack.get('cover')
    });
  },
  renderFFT: function (freqByteData) {
    var
      ctx     = this.ctx,
      h       = this.CANVAS_HEIGHT,
      w       = this.CANVAS_WIDTH,
      // count   = 512,
      count   = 128,
      spacing = 1,
      width   = w/count - spacing,
      binSize = freqByteData.length / count,
      max = 1700;

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
    lingrad.addColorStop(0, '#36B1BF');
    lingrad.addColorStop(1, '#F2385A');
    ctx.fillStyle = lingrad;

    // for ( var i = 0; i < count; i++ ) {
    //   ctx.fillRect( i * ( spacing + width ), h, width, Math.floor(-freqByteData[ i ] * h/ (max * width)) * width );
    // }

    // for ( var i = 0, l = h/width; i < l; i++ ) {
    //   ctx.clearRect(0, i*width, w, spacing)
    // }

    for (var i = 0, limit = 2*Math.PI, step = limit/count; i <= count; i += 1) {
      ctx.beginPath();
      var begin = i*step;
      var end = (i + 0.75)*step;
      ctx.moveTo(100, 100);
      var m = Math.min(80, Math.sqrt(freqByteData[ i ])* 2);
      ctx.arc(100,100, m,begin,end,false);
      ctx.lineTo(100, 100);
      ctx.closePath();
      ctx.fillStyle = lingrad;
      ctx.fill();
    }

  },
  render: function () {
    this.$el.html(this.template(this.model.toJSON()));
    this.$('.dial').knob({
      draw: renderRing
    });
    Kort.bind();
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
  this.i.val(convert(this.$.val(), parseInt(this.$.data('rangeMax') || this.$.data('max'))));
};