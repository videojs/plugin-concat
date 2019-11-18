import window from 'global/window';
import {
  mapLegacyAvcCodecs
} from '@videojs/vhs-utils/dist/codecs.js';
import { codecsForPlaylists } from './codecs';

/**
 * Removes unsupported playlists from each provided VHS-formatted manifest object. The
 * checks to determine support include:
 *
 * - Presence of both audio and video in the playlists (audio only and video only are not
 *   currently supported), either as muxed or demuxed (via a default alt audio playlist)
 * - Video codecs supported by the browser's MSE (media source extensions) implementation
 *
 * Note that these checks do not guarantee a successful concatenation operation. Limited
 * availability of information (e.g., no codec info for media manifests), and a lack of
 * checks for compatibility between manifests, may result in an unsuccessful concatenation
 * operation. These are rarer cases though, and should be handled by the user.
 *
 * @param {Object[]} manifestObjects
 *        An array of (master or media) manifest objects (in the format used by VHS)
 *
 * @return {Object[]}
 *          An array of arrays containing supported playlists from each manifest object
 */
export const removeUnsupportedPlaylists = (manifestObjects) => {
  // remove audio and video only playlists, as well as playlists with video codecs not
  // supported by the browser
  return manifestObjects.map((manifestObject) => {
    // Recreate the map for each manifest, as if it is reused for different manifests, and
    // they each contain the same playlist (or one is a media and another is a master
    // containing that media), then the information may be different depending on the
    // manifest (e.g., one may have demuxed audio, the other video only).
    const playlistToCodecsMap = codecsForPlaylists(manifestObject);
    // handle master and media playlists
    const playlists =
      manifestObject.playlists ? manifestObject.playlists : [manifestObject];

    return playlists.filter((playlist) => {
      const codecs = playlistToCodecsMap[playlist.resolvedUri];

      // Allow playlists with no specified codecs to pass through. Although the playlists
      // should have codec info, this prevents missing codec info from auto-failing.
      if (!codecs) {
        return true;
      }

      if (codecs.codecCount !== 2) {
        return false;
      }

      if (window.MediaSource &&
          window.MediaSource.isTypeSupported &&
          // ignore demuxed audio for the MSE support check to mirror VHS' check
          !window.MediaSource.isTypeSupported('video/mp4; codecs="' +
            mapLegacyAvcCodecs(playlist.attributes.CODECS) + '"')) {
        return false;
      }

      return true;
    });
  });
};

