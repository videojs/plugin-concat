import { parse as parseMpd } from 'mpd-parser';
import { Parser as M3u8Parser } from 'm3u8-parser';
import { simpleTypeFromSourceType } from '@videojs/vhs-utils/dist/media-types';
import resolveUrl from '@videojs/vhs-utils/dist/resolve-url.js';

/**
 * Parses an m3u8 string using m3u8-parser.
 *
 * @param {string} manifestString
 *        M3U8 manifest string
 *
 * @return {Object}
 *         Manifest object
 */
export const parseM3u8 = (manifestString) => {
  const parser = new M3u8Parser();

  parser.push(manifestString);
  parser.end();

  return parser.manifest;
};

/**
 * Adds a resolvedUri property for each URI in the segment.
 *
 * @param {Object} segment
 *        The segment
 * @param {string} baseUri
 *        URI of the playlist the segment is from
 */
export const resolveSegmentUris = (segment, baseUri) => {
  if (!segment.resolvedUri) {
    segment.resolvedUri = resolveUrl(baseUri, segment.uri);
  }
  if (segment.key && !segment.key.resolvedUri) {
    segment.key.resolvedUri = resolveUrl(baseUri, segment.key.uri);
  }
  if (segment.map && !segment.map.resolvedUri) {
    segment.map.resolvedUri = resolveUrl(baseUri, segment.map.uri);
  }
};

/**
 * Adds properties to a master manifest object that are needed by videojs-concat. For
 * instance, resolvedUri for playlists, since videojs-concat may need to request the
 * playlists.
 *
 * Note that videojs/http-streaming may add more properties to the manifest object
 * afterwards, but if they're not needed by videojs-concat, videojs-concat leaves that
 * job to videojs/http-streaming.
 *
 * @param {Object} master
 *        Master manifest object
 */
export const addPropertiesToMaster = (master) => {
  for (let i = 0; i < master.playlists.length; i++) {
    const playlist = master.playlists[i];

    if (!playlist.uri) {
      playlist.uri = `placeholder-uri-${i}`;
    }
    playlist.resolvedUri = resolveUrl(master.uri, playlist.uri);

    if (playlist.segments) {
      playlist.segments.forEach((segment) => {
        resolveSegmentUris(segment, master.uri);
      });
    }
  }

  const audioGroup = master.mediaGroups.AUDIO;

  if (audioGroup) {
    for (const groupKey in audioGroup) {
      for (const labelKey in audioGroup[groupKey]) {
        const mediaProperties = audioGroup[groupKey][labelKey];

        if (mediaProperties.uri) {
          mediaProperties.resolvedUri = resolveUrl(master.uri, mediaProperties.uri);
        }

        if (mediaProperties.playlists) {
          if (!mediaProperties.playlists[0].resolvedUri) {
            // For DASH playlists, where the audio playlists are already resolved, a
            // resolvedUri needs to exist to act as an identifier. Use a unique
            // combination across and within manifests to prevent collisions.
            mediaProperties.playlists[0].resolvedUri =
              `${master.resolvedUri}-audio-placeholder-${groupKey}-${labelKey}`;
          }
          mediaProperties.playlists[0].segments.forEach((segment) => {
            resolveSegmentUris(segment, master.uri);
          });
        }
      }
    }
  }
};

/**
 * Adds properties to a media playlist object that are needed by videojs-concat.
 *
 * Note that videojs/http-streaming may add more properties to the manifest object
 * afterwards, but if they're not needed by videojs-concat, videojs-concat leaves that
 * job to videojs/http-streaming.
 *
 * @param {Object} media
 *        Media manifest object
 */
export const addPropertiesToMedia = (media) => {
  // Media playlists parsed by m3u8 parser won't have an attributes object attached to
  // them, however, the object is necessary for later inspection (when doing resolution
  // and bandwidth comparisons).
  media.attributes = media.attributes || {};

  // mpd-parser provides resolved URIs for all segments, but m3u8-parser does not. To
  // ensure everything is consistent, add resolvedUri to segments missing that property.
  media.segments.forEach((segment) => {
    resolveSegmentUris(segment, media.uri);
  });
};

/**
 * Parses a manifest string into a VHS supported manifest object.
 *
 * @param {Object} config
 *        Object containing arguments
 * @param {string} config.url
 *        URL to the manifest
 * @param {string} config.manifestString
 *        The manifest itself
 * @param {string} config.mimeType
 *        Mime type of the manifest
 *
 * @return {Object}
 *          A VHS manifest object
 */
export const parseManifest = ({ url, manifestString, mimeType }) => {
  const type = simpleTypeFromSourceType(mimeType);
  const manifest = type === 'dash' ?
    parseMpd(manifestString, { manifestUri: url, clientOffset: 0 }) :
    parseM3u8(manifestString);

  // Although VHS adds resolvedUri properties to the playlists and segments,
  // videojs-concat needs the playlist resolvedUri attributes in order to request the
  // playlists.
  manifest.uri = url;
  manifest.resolvedUri = url;

  if (manifest.playlists) {
    addPropertiesToMaster(manifest);
  } else {
    addPropertiesToMedia(manifest);
  }

  return manifest;
};
