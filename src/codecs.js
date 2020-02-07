import {
  parseCodecs,
  audioProfileFromDefault
} from '@videojs/vhs-utils/dist/codecs.js';

/**
 * Determines the video and audio codecs for each playlist and returns an object
 * associating each playlist's resolvedUri to its respective codecs.
 *
 * @param {Object} manifest
 *        A master or media manifest object (in the format used by VHS)
 *
 * @return {Object}
 *         Object associating playlists to their parsed codecs
 */
export const codecsForPlaylists = (manifest) => {
  // handle master and media playlists
  const playlists = manifest.playlists ? manifest.playlists : [manifest];

  return playlists.reduce((acc, playlist) => {
    // Technically, there should always be the CODECS attribute (and an attributes
    // object). But if they don't exist (e.g., in a media playlist that hasn't had the
    // attributes object added, since m3u8-parser doesn't add the attributes object to
    // media playlists), let calling functions decide what to do with playlists with
    // missing codec info.
    if (!playlist.attributes || !playlist.attributes.CODECS) {
      return acc;
    }

    const codecs = parseCodecs(playlist.attributes.CODECS);

    if (codecs.codecCount !== 2 && playlist.attributes.AUDIO) {
      const audioProfile = audioProfileFromDefault(manifest, playlist.attributes.AUDIO);

      if (audioProfile) {
        codecs.audioProfile = audioProfile;
        codecs.codecCount++;
      }
    }

    acc[playlist.resolvedUri] = codecs;

    return acc;
  }, {});
};

/**
 * @typedef {Object} AudioAndVideoTypes
 * @property {String} audio
 *           Audio MIME type
 * @property {String} video
 *           Video MIME type
 */

/**
 * Returns an array of AudioAndVideoTypes, where each AudioAndVideoTypes object includes
 * audio and video MIME types, including codecs.
 *
 * videoPlaylists and manifestObjects should match one-to-one, where each index is
 * associated across the arrays.
 *
 * Note that only playlists with master manifests are currently supported, as the master
 * manifests include codec information.
 *
 * @param {Object[]} videoPlaylists
 *        An array of video playlists
 * @param {Object[]} manifestObjects
 *        An array of master manifest playlists
 * @return {AudioAndVideoTypes[]}
 *        An array of audio and video MIME types with codecs
 *        @see {@link https://www.w3.org/TR/html51/semantics-embedded-content.html#mime-types|Mime Types}
 */
export const getAudioAndVideoTypes = ({
  videoPlaylists,
  manifestObjects
}) => {
  const audioAndVideoTypes = [];

  for (let i = 0; i < videoPlaylists.length; i++) {
    const videoPlaylist = videoPlaylists[i];
    const manifestObject = manifestObjects[i];
    const playlistToCodecsMap = codecsForPlaylists(manifestObject);
    const codecs = playlistToCodecsMap[videoPlaylist.resolvedUri];

    // HLS media playlist, or an HLS master without the CODECS attribute attached to
    // playlists
    if (!codecs) {
      audioAndVideoTypes.push(null);
      continue;
    }

    const types = {};

    if (codecs.videoCodec) {
      // container types are fixed because VHS transmuxes to mp4
      types.video =
        `video/mp4; codecs="${codecs.videoCodec}${codecs.videoObjectTypeIndicator}"`;
    }

    if (codecs.audioProfile) {
      types.audio = `audio/mp4; codecs="mp4a.40.${codecs.audioProfile}"`;
    }

    audioAndVideoTypes.push(types);
  }

  return audioAndVideoTypes;
};
