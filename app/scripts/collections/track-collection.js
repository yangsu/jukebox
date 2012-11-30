audio.Collections.TrackCollection = Backbone.Collection.extend({

  url: 'http://www.djbox.fm/api/stream',
  model: audio.Models.TrackModel,
  fetchTrackStreams: function () {
    var self = this
      , total = this.length
      , count = 0
      , successHandler = function (cb) {
        if (++count >= total) {
          self.trigger('loadedAllTracks');
        }
      };
    this.each(function (trackModel) {
      trackModel.fetch({
        success: successHandler
      });
    });
  }

});
