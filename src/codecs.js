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
