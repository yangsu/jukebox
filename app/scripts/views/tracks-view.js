audio.Views.TracksView = Backbone.View.extend({
  initialize: function () {
    this.subviews = [];
  },
  constructSubviews: function () {
    var self = this
      , $tracks = self.$el;
    self.model.each(function (model) {
      var trackView = new audio.Views.TrackView({
        model: model
      });
      self.subviews.push(trackView);
      $tracks.append(trackView, trackView.$el);
    });
    return self;
  },
  render: function () {
    _.each(this.subviews, function (subview) {
      subview.render();
    });
    return this;
  }
});