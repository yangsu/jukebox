audio.Views.TrackView = Backbone.View.extend({

	template: audio.template('track'),
	initialize: function () {
		this.model
			.on('progress', this.updateProgressBar, this)
			.on('loaded', this.onLoad, this)
			.on('sync', this.render, this)
		;
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
	render: function () {
		this.$el.html(this.template(this.model.toJSON()));
		this.$('.dial').knob({
			readOnly: true,
			displayInput: false
		});
		return this;
	}

});