import videojs from 'video.js';
import { version as VERSION } from '../package.json';
import { concatenateVideos } from './concatenate';

// Cross-compatibility for Video.js 5 and 6.
const registerPlugin = videojs.registerPlugin || videojs.plugin;

/**
 * @typedef {Object} KeySystems
 *
 * Manifest's DRM configuration for https://github.com/videojs/videojs-contrib-eme
 *
 * Assumptions for DRMed content: each video/audio playlist will use the same key system
 * configuration, and won't have different PSSH values within a playlist.
 */

/**
 * @typedef {Object} ManifestConfig
 * @property {string} url
 *           URL to the manifest
 * @property {string} mimeType
 *           Mime type of the manifest
 *           @see {@link https://www.w3.org/TR/html51/semantics-embedded-content.html#mime-types|Mime Types}
 * @property {KeySystems} keySystems
 *           Manifest's DRM configuration object
 */

/**
 * @callback initializeKeySystems
 * @param {Object} player
 *        The video.js player object
 */

/**
 * @typedef {Object} ConcatenationResult
 * @property {Object} manifestObject
 *           Concatenated manifest object
 * @property {initializeKeySystems} [initializeKeySystems]
 *           Function to call after setting source to initialize EME for DRMed sources if
 *           DRM is required for any of the sources
 */

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
 * If any of the sources are encrypted with a supported CDM, and keySystems are provided
 * for the source, then the result will include a function to call to initialize
 * videojs-contrib-eme for playback of the encrypted sources.
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
