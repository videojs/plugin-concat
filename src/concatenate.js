import { requestAll } from './request-utils';
import { parseManifest } from './manifest-parser';
import {
  chooseVideoPlaylists,
  chooseAudioPlaylists
} from './choose-playlists';
import {
  removeUnsupportedPlaylists
} from './validators';
import {
  combinePlaylists,
  constructMasterManifest
} from './generators';

/**
 * Requests and parses any unresolved playlists and calls back with the result.
 *
 * @param {Object} config
 *        Object containing arguments
 * @param {Object[]} config.playlists
 *        An array of playlist objects
 * @param {string[]} config.mimeTypes
 *        An array of mime types (should be one-for-one with the playlists array)
 * @param {function(Object, Object)} config.callback
 *        Callback function with error and playlist URI to resolved playlist objects map
 */
export const resolvePlaylists = ({ playlists, mimeTypes, callback }) => {
  const playlistUris = playlists
    // if the segments are already resolved, don't need to request (DASH case)
    .filter((playlist) => !playlist.segments)
    .map((playlist) => playlist.resolvedUri);
  const preResolvedPlaylists = playlists.filter((playlist) => playlist.segments);
  const origPlaylistsToParsed = {};

  preResolvedPlaylists.forEach((playlist) => {
    origPlaylistsToParsed[playlist.resolvedUri] = playlist;
  });

  if (!playlistUris.length) {
    // all playlists pre-resolved
    callback(null, origPlaylistsToParsed);
    return;
  }

  const uriToPlaylistsMap = {};
  const uriToMimeTypeMap = {};

  for (let i = 0; i < playlists.length; i++) {
    const playlist = playlists[i];

    // it's possible for the caller to concat two of the same video together
    if (!uriToPlaylistsMap[playlist.resolvedUri]) {
      uriToPlaylistsMap[playlist.resolvedUri] = [];
    }
    uriToPlaylistsMap[playlist.resolvedUri].push(playlist);
    uriToMimeTypeMap[playlist.resolvedUri] = mimeTypes[i].mimeType;
  }

  requestAll(playlistUris, (err, responses) => {
    if (err) {
      callback(err);
      return;
    }

    for (let i = 0; i < playlistUris.length; i++) {
      const uri = playlistUris[i];
      const origPlaylists = uriToPlaylistsMap[uri];
      const playlistString = responses[uri];
      const mimeType = uriToMimeTypeMap[uri];
      const playlist = parseManifest({
        url: uri,
        manifestString: playlistString,
        mimeType
      });

      for (let j = 0; j < origPlaylists.length; j++) {
        const origPlaylist = origPlaylists[j];

        origPlaylistsToParsed[origPlaylist.resolvedUri] = playlist;
      }
    }

    callback(null, origPlaylistsToParsed);
  });
};

/**
 * Returns a single rendition VHS formatted master playlist object given a list of
 * manifest strings, their URLs, their mime types, and a target vertical resolution.
 *
 * As of now, only DASH and HLS are supported.
 *
 * This function will select the closest rendition (absolute value difference) to the
 * target vertical resolution. If resolution information is not available as part of the
 * manifest, then it will fall back to the INITIAL_BANDWIDTH config value from VHS.
 *
 * @param {Object} config
 *        Object containing arguments
 * @param {Object[]} config.manifests
 *        Array of manifest objects
 * @param {string} config.manifests[].url
 *        URL to a manifest
 * @param {string} config.manifests[].manifestString
 *        The manifest itself
 * @param {string} config.manifests[].mimeType
 *        Mime type of the manifest
 * @param {number} config.targetVerticalResolution
 *        The vertical resolution to search for among playlists within each manifest
 * @param {function(Object, ConcatenationResult)} config.callback
 *        Callback function with error and result object parameters
 *
 * @throws Will throw if there are incompatibility errors between the playlists
 */
const concatenateManifests = ({ manifests, targetVerticalResolution, callback }) => {
  const manifestObjects = manifests.map((manifest) => parseManifest({
    url: manifest.url,
    manifestString: manifest.manifestString,
    mimeType: manifest.mimeType
  }));

  const supportedPlaylists = removeUnsupportedPlaylists(manifestObjects);

  supportedPlaylists.forEach((playlists) => {
    if (playlists.length === 0) {
      throw new Error('Did not find a supported playlist for each manifest');
    }
  });

  // Video renditions are assumed to be codec compatible, but may have different
  // resolutions. Choose the video rendition closest to the target resolution from each
  // manifest.
  const videoPlaylists = chooseVideoPlaylists(
    supportedPlaylists,
    targetVerticalResolution
  );

  // A rendition with demuxed audio can't be concatenated with a rendition with muxed
  // audio. VHS assumes (based on how most media streaming formats work) that a rendition
  // will not change how it's playing back audio (whether from muxed as part of the
  // rendition's video segments, or demuxed as segments in an alternate audio playlist),
  // except due to user interaction (e.g., clicking an alternate audio playlist in the
  // UI). Therefore, a rendition must maintain a consistent playback scheme (as either
  // demuxed or muxed) throughout the its entire stream.
  const audioPlaylists = chooseAudioPlaylists(manifestObjects, videoPlaylists);
  const allPlaylists = videoPlaylists.concat(audioPlaylists);
  // To correctly set the mime types for all playlists, we have to use the mime types
  // provided by the manifests for the associated playlists. Since  videoPlaylists and
  // audioPlaylists are associated 1:1, and the manifests to videoPlaylists are 1:1, the
  // manifest mime types may be reused for both.
  const mimeTypes = manifests.map((manifest) => manifest.mimeType);

  for (let i = 0; i < audioPlaylists.length; i++) {
    mimeTypes.push(mimeTypes[i]);
  }

  resolvePlaylists({
    playlists: allPlaylists,
    mimeTypes,
    callback: (err, resolvedPlaylistsMap) => {
      if (err) {
        callback(err);
        return;
      }

      allPlaylists.forEach((playlist) => {
        playlist.segments = resolvedPlaylistsMap[playlist.resolvedUri].segments;
      });

      const combinedVideoPlaylist = combinePlaylists({ playlists: videoPlaylists });
      const combinedAudioPlaylist = audioPlaylists.length ? combinePlaylists({
        playlists: audioPlaylists,
        uriSuffix: '-audio'
      }) : null;
      const manifestObject = constructMasterManifest({
        videoPlaylist: combinedVideoPlaylist,
        audioPlaylist: combinedAudioPlaylist
      });
      const concatenationResult = { manifestObject };

      callback(null, concatenationResult);
    }
  });
};

/**
 * @typedef {Object} ManifestConfig
 * @property {string} url
 *           URL to the manifest
 * @property {string} mimeType
 *           Mime type of the manifest
 *           @see {@link https://www.w3.org/TR/html51/semantics-embedded-content.html#mime-types|Mime Types}
 */

/**
 * Returns an error message if there's an issue with the user provided manifest objects,
 * or returns null if no error (at the top level).
 *
 * @param {ManifestConfig[]} manifests
 *        Array of ManifestConfig objects
 * @return {string|null}
 *         Error message or null if no error
 */
export const getProvidedManifestsError = (manifests) => {
  if (!manifests || !manifests.length) {
    return 'No sources provided';
  }

  for (let i = 0; i < manifests.length; i++) {
    // The requirement for every manifest needing a URL may be reconsidered in the future
    // to accept pre-parsed manifest objects.
    if (!manifests[i].url) {
      return 'All manifests must include a URL';
    }

    if (!manifests[i].mimeType) {
      return 'All manifests must include a mime type';
    }
  }

  return null;
};

/**
 * @typedef {Object} ConcatenationResult
 * @property {Object} manifestObject
 *           Concatenated manifest object
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
 * @param {Object} config
 *        Object containing arguments
 * @param {ManifestConfig[]} config.manifests
 *        Array of manifest config objects
 * @param {number} config.targetVerticalResolution
 *        The vertical resolution to search for among playlists within each manifest
 * @param {function(Object, ConcatenationResult)} config.callback
 *        Callback function with error and result object parameters
 */
export const concatenateVideos = ({ manifests, targetVerticalResolution, callback }) => {
  const errorMessage = getProvidedManifestsError(manifests);

  if (errorMessage) {
    callback({ message: errorMessage });
    return;
  }

  const urls = manifests.map((manifestObject) => manifestObject.url);

  requestAll(urls, (err, responses) => {
    if (err) {
      callback(err);
      return;
    }

    const orderedManifests = manifests.map((manifestObject) => {
      return {
        url: manifestObject.url,
        manifestString: responses[manifestObject.url],
        mimeType: manifestObject.mimeType
      };
    });

    try {
      concatenateManifests({
        manifests: orderedManifests,
        targetVerticalResolution,
        callback
      });
    } catch (e) {
      callback(e);
    }
  });
};
