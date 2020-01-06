import videojs from 'video.js';
import { version as VERSION } from '../package.json';
import { concatenateVideos } from './concatenate';

// Cross-compatibility for Video.js 5 and 6.
const registerPlugin = videojs.registerPlugin || videojs.plugin;

/**
 * Calls back with a single rendition VHS formatted master playlist object given a list of
 * URLs and their mime types as well as a target vertical resolution.
 *
 * As of now, only DASH and HLS are supported.
 *
 * This function will select the closest rendition (absolute value difference) to the
 * target vertical resolution. If resolution information is not available as part of the
 * manifest, then it will fall back to the INITIAL_BANDWIDTH config value from VHS.
 *
 * @param {Object} config
 *        Object containing arguments
 * @param {ManifestConfig[]} config.manifests
 *        Array of manifest config objects
 * @param {number} config.targetVerticalResolution
 *        The vertical resolution to search for among playlists within each manifest
 * @param {function(Object, ConcatenationResult)} config.callback
 *        Callback function with error and result object parameters
 */
const concat = (config) => {
  // When the plugin is registered, the concat function will be called. Ignore that call
  // and use player.concat(...) as the top level function call.
  if (!config) {
    return;
  }

  concatenateVideos(config);
};

// Register the plugin with video.js.
registerPlugin('concat', concat);

// Include the version number.
concat.VERSION = VERSION;

export default concat;
