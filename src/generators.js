import window from 'global/window';

/**
 * Joins the segments of multiple playlists together into one playlist, with a
 * discontinuity separating each set of segments. The resultant playlist includes basic
 * properties necessary for VHS to play the playlist.
 *
 * @param {Object} config
 *        Object containing arguments
 * @param {Object[]} config.playlists
 *        An array of playlist objects (in the format used by VHS)
 * @param {string} config.uriSuffix
 *        A suffix to use for the mocked URI of the combined playlist. This is needed when
 *        using demuxed audio in VHS, as, if the generated URI matches a video playlist's
 *        generated URI, the rendition will be considered audio only.
 *
 * @return {Object}
 *          A single playlist containing the combined elements (and segment arrays) of the
 *          provided playlists
 */
export const combinePlaylists = ({ playlists, uriSuffix = '' }) => {
  const combinedSegments = playlists.reduce((acc, playlist) => {
    const firstNewSegmentIndex = acc.length;
    // need to clone because we're modifying the segment objects
    const clonedSegments = JSON.parse(JSON.stringify(playlist.segments));
    const concatenatedSegments = acc.concat(clonedSegments);

    // don't add a discontinuity to the first segment
    if (acc.length > 0) {
      concatenatedSegments[firstNewSegmentIndex].discontinuity = true;
    }

    return concatenatedSegments;
  }, []);

  // As defined by the HLS spec, the BANDWIDTH attribute for a playlist is the peak
  // bandwidth in the stream, therefore, for a combined playlist, the max of the BANDWIDTH
  // values is used.
  //
  // Spec reference:
  // https://tools.ietf.org/html/draft-pantos-http-live-streaming-23#section-4.3.4.2
  const maxBandwidth = playlists.reduce((acc, playlist) => {
    if (playlist.attributes &&
        playlist.attributes.BANDWIDTH &&
        (!acc || playlist.attributes.BANDWIDTH > acc)) {
      return playlist.attributes.BANDWIDTH;
    }
    return acc;
  }, null);
  // Because the codecs may be different (but compatible), use the first defined set, if
  // available.
  const codecs = playlists.reduce((acc, playlist) => {
    if (acc) {
      return acc;
    }
    return playlist.attributes ? playlist.attributes.CODECS : null;
  }, null);

  // Attributes used are a subset of
  // https://tools.ietf.org/html/draft-pantos-http-live-streaming-23#section-4.3.4.2
  // depending on what is available in the playlists. For instance, BANDWIDTH and CODEC
  // attributes may only be available if the original sources were master playlists.
  //
  // Although there are other approaches that may be taken in determining the best set of
  // combined attributes (for instance, using the first playlist's attributes, or merging
  // all attributes in all playlists), using a known subset is safest, as it should
  // prevent any undefined behavior using attributes that may only be relevant for a
  // specific playlist.
  const combinedPlaylist = {
    attributes: {},
    segments: combinedSegments
  };

  if (maxBandwidth) {
    combinedPlaylist.attributes.BANDWIDTH = maxBandwidth;
  }
  if (codecs) {
    combinedPlaylist.attributes.CODECS = codecs;
  }
  combinedPlaylist.uri = `combined-playlist${uriSuffix}`;
  combinedPlaylist.resolvedUri = combinedPlaylist.uri;
  combinedPlaylist.playlistType = 'VOD';
  combinedPlaylist.targetDuration = playlists.reduce((acc, playlist) => {
    return acc > playlist.targetDuration ? acc : playlist.targetDuration;
  }, 0);
  combinedPlaylist.endList = true;
  combinedPlaylist.mediaSequence = 0;
  combinedPlaylist.discontinuitySequence = 0;
  combinedPlaylist.discontinuityStarts = [];

  let timeline = 0;

  for (let i = 0; i < combinedPlaylist.segments.length; i++) {
    const segment = combinedPlaylist.segments[i];

    if (segment.discontinuity) {
      combinedPlaylist.discontinuityStarts.push(i);
      timeline++;
    }
    segment.number = i;
    segment.timeline = timeline;
  }

  return combinedPlaylist;
};

/**
 * Constructs a basic (only the essential information) master manifest given an array of
 * playlists.
 *
 * @param {Object} config
 *        Object containing arguments
 * @param {Object} config.videoPlaylist
 *        A video playlist object (in the format used by VHS)
 * @param {Object} [config.audioPlaylist]
 *        An audio playlist object (in the format used by VHS)
 *
 * @return {Object}
 *          A master manifest object containing the playlists
 */
export const constructMasterManifest = ({ videoPlaylist, audioPlaylist }) => {
  // create copies of the playlists
  videoPlaylist = JSON.parse(JSON.stringify(videoPlaylist));
  if (audioPlaylist) {
    audioPlaylist = JSON.parse(JSON.stringify(audioPlaylist));
  }

  const videoPlaylists = [videoPlaylist];
  const audioPlaylists = audioPlaylist ? [audioPlaylist] : null;

  // VHS playlist arrays have properties with the playlist URI in addition to the standard
  // indices. This must be maintained for compatibility.
  videoPlaylists[videoPlaylist.uri] = videoPlaylist;

  if (audioPlaylists) {
    audioPlaylists[audioPlaylist.uri] = audioPlaylist;
  }

  const master = {
    mediaGroups: {
      'AUDIO': {},
      'VIDEO': {},
      'CLOSED-CAPTIONS': {},
      'SUBTITLES': {}
    },
    // placeholder URI, same as used in VHS when no master
    uri: window.location.href,
    playlists: videoPlaylists
  };

  if (audioPlaylist) {
    master.mediaGroups.AUDIO.audio = {
      default: {
        autoselect: true,
        default: true,
        // language is not included to avoid having to verify default languages between
        // concatenated playlists
        language: '',
        uri: 'combined-audio-playlists',
        playlists: audioPlaylists
      }
    };
    master.playlists[0].attributes.AUDIO = 'audio';
  }

  return master;
};
