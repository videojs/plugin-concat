// Bandwidth to use in playlist selects when resolution information is not provided.
// 0.5 MB/s chosen as it was the default VHS bandwidth to use for the start of the
// rendition selection algorithm.
export const DEFAULT_BANDWIDTH = 4194304;

/**
 * Selects the closest matching video playlist to the provided vertical resolution from
 * an array of manifest objects.
 *
 * If the playlists do not include resolution information, the function will match based
 * on a default bandwidth.
 *
 * If only some playlists include resolution information, the function will only consider
 * those with resolution information.
 *
 * @param {Object[]} manifestsPlaylists
 *        An array of arrays of playlist objects
 * @param {number} targetVerticalResolution
 *        The vertical resolution to search for among playlists within each manifest
 *
 * @return {Object[]}
 *          An array of playlist objects, one from each of the provided manifests
 */
export const chooseVideoPlaylists = (manifestsPlaylists, targetVerticalResolution) => {
  return manifestsPlaylists.map((manifestPlaylists) => {
    if (manifestPlaylists.length === 1) {
      return manifestPlaylists[0];
    }

    return manifestPlaylists.reduce((acc, playlist) => {
      if (!acc) {
        return playlist;
      }

      if (playlist.attributes.RESOLUTION) {
        // If the selected playlist doesn't have resolution information, and this one
        // does, choose the playlist with resolution info.
        if (!acc.attributes.RESOLUTION) {
          return playlist;
        }

        if (Math.abs(playlist.attributes.RESOLUTION - targetVerticalResolution) <
            Math.abs(acc.attributes.RESOLUTION - targetVerticalResolution)) {
          return playlist;
        }
        return acc;
      }

      // If the selected playlist does have resolution information, and this one doesn't,
      // stick with the playlist with resolution info.
      if (acc.attributes.RESOLUTION) {
        return acc;
      }

      // BANDWIDTH attribute is required
      return Math.abs(playlist.attributes.BANDWIDTH - DEFAULT_BANDWIDTH) <
        Math.abs(acc.attributes.BANDWIDTH - DEFAULT_BANDWIDTH) ? playlist : acc;
    }, null);
  });
};

/**
 * Selects valid audio playlists for the provided video playlists, if a relevant audio
 * playlist exists.
 *
 * Note that the manifest objects and video playlists must be the same lengths and in the
 * same order.
 *
 * Only one audio playlist will be selected for each video playlist, and only if the audio
 * playlist has the DEFAULT attribute set to YES. This means that alternate audio is not
 * supported.
 *
 * @param {Object[]} manifestObjects
 *        An array of manifest objects (in the format used by VHS)
 * @param {Object[]} videoPlaylists
 *        An array of video playlists
 *
 * @return {Object[]}
 *          An array of audio playlist objects, one for each of the provided video
 *          playlists
 */
export const chooseAudioPlaylists = (manifestObjects, videoPlaylists) => {
  if (manifestObjects.length !== videoPlaylists.length) {
    throw new Error('Invalid number of video playlists for provided manifests');
  }

  const numExpectedPlaylists = manifestObjects.length;
  const audioPlaylists = [];

  for (let i = 0; i < numExpectedPlaylists; i++) {
    const manifestObject = manifestObjects[i];
    const videoPlaylist = videoPlaylists[i];

    if (!videoPlaylist.attributes.AUDIO ||
        !manifestObject.mediaGroups.AUDIO[videoPlaylist.attributes.AUDIO]) {
      // unable to find a matching audio object
      continue;
    }

    const manifestAudioPlaylists =
      manifestObject.mediaGroups.AUDIO[videoPlaylist.attributes.AUDIO];
    const audioPlaylistNames = Object.keys(manifestAudioPlaylists);

    for (let j = 0; j < audioPlaylistNames.length; j++) {
      const audioPlaylist = manifestAudioPlaylists[audioPlaylistNames[j]];

      if (audioPlaylist.default &&
          // some audio playlists are merely identifiers for muxed audio, don't include
          // those (note that resolvedUri should handle the HLS case, presence of
          // playlists the DASH case)
          (audioPlaylist.resolvedUri || audioPlaylist.playlists)) {
        audioPlaylists.push(audioPlaylist.playlists ?
          audioPlaylist.playlists[0] : audioPlaylist);
        break;
      }
    }
  }

  // This should cover multiple cases. For instance, if a manifest was video only or if
  // a manifest only had muxed default audio.
  if (audioPlaylists.length > 0 && audioPlaylists.length !== numExpectedPlaylists) {
    throw new Error('Did not find matching audio playlists for all video playlists');
  }

  return audioPlaylists;
};
