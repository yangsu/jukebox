audio.Views.TrackView = Backbone.View.extend({
  tagName: 'li',
  className: 'track',
  template: audio.template('track'),
  initialize: function () {
    this.model
      .on('progress', this.updateProgressBar, this)
      .on('loaded', this.onLoad, this);
  },
  updateProgressBar: function (progressPercentage) {
    this.$('#progress').val(progressPercentage).trigger('change');
  },
  onLoad: function () {
    console.log('loaded' + this.id);
  },
  render: function () {
    this.$el.html(this.template(this.model.toJSON()));
    this.$('.dial').knob();
    return this;
  }
});