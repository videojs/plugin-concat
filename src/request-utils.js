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
  // remove duplicates
  urls = urls.filter((element, index, array) => array.indexOf(element) === index);

  let didError = false;
  const responses = {};
  const pendingRequests = [];

  urls.forEach((url) => {
    const request = videojs.xhr(url, (err, response) => {
      if (didError) {
        return;
      }

      pendingRequests.splice(pendingRequests.indexOf(request), 1);

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
        didError = true;
        // abort any pending requests, since one error is enough to fail the entire set
        pendingRequests.forEach((pendingRequest) => pendingRequest.abort());
        return;
      }

      responses[url] = request.responseText;

      if (Object.keys(responses).length === urls.length) {
        callback(null, responses);
      }
    });

    pendingRequests.push(request);
  });
};
