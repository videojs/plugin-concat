import videojs from 'video.js';

/**
 * Requests all of the urls provided, then calls back.
 *
 * @param {string[]} urls
 *        An array of urls
 * @param {function(Object, Object)} callback
 *        Callback function with error and object containing url to response text entries
 */
export const requestAll = (urls, callback) => {
  let requestsRemaining = urls.length;
  const responses = {};

  urls.forEach((url) => {
    const request = videojs.xhr(url, (err, response) => {
      if (requestsRemaining <= 0) {
        // this case should only be triggered if a previous requested erred
        return;
      }

      const responseStatusIsSuccess =
        response &&
        (
          response.statusCode === 200 ||
          response.statusCode === 206 ||
          response.statusCode === 0
        );

      if (err || !responseStatusIsSuccess) {
        callback({
          // err will occur if the browser errors, not on server errors, so pass back the
          // message for the user to be able to diagnose the issue
          message: err ? err.message : 'Request failed',
          request
        });
        // clear remaining requests to break future callbacks
        requestsRemaining = 0;
        return;
      }

      requestsRemaining--;

      responses[url] = request.responseText;

      if (requestsRemaining === 0) {
        callback(null, responses);
      }
    });
  });
};
