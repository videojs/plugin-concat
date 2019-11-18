const generate = require('videojs-generate-karma-config');

module.exports = function(config) {

  // see https://github.com/videojs/videojs-generate-karma-config
  // for options
  const options = {
    browsers(aboutToRun) {
      // never test on Safari, as it times out when run in the background
      // @see {@link https://github.com/karma-runner/karma-safari-launcher/issues/24}
      return aboutToRun.filter((launcherName) => {
        return launcherName !== 'Safari';
      });
    }
  };

  config = generate(config, options);

  // any other custom stuff not supported by options here!
};
