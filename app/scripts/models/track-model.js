audio.Models.TrackModel = Backbone.Model.extend({
  idAttribute: 'sid',
  url: function () {
    return this.collection.url + '/' + this.id;
  },
  fetch: function (options) {
    var model = this
      , url = options.url || model.get('url') || model.url() || urlError();

    options = options || {};

    options.error = Backbone.wrapError(options.error, model, options);

    // Load buffer asynchronously
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";

    request.onprogress = function (evt) {
      if (evt.lengthComputable) {
        var percentComplete = (evt.loaded / evt.total)*100;
        model.trigger('progress', percentComplete);
      }
    };
    request.onload = function(resp, status, xhr) {
      if (window.context) {
        window.context.decodeAudioData(
          request.response,
          function(buffer) {
            if (!buffer) {
              console.log('error decoding file data: ' + url);
              options.error && options.error();
            }

            model.set({
              'buffer': buffer,
              'loaded': true
            }).trigger('loaded');

            if (options.success) options.success(model, resp);
          },
          options.error
        );
      } else {
        console.log('must have a context');
        options.error && options.error();
      }
    };

    request.onerror = options.error;

    request.send();

  }
});