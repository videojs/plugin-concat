import {
  resolveSegmentUris,
  parseManifest as parseHlsManifest,
  parseMasterXml
} from '@videojs/vhs-utils/dist/manifest-parser';
import { simpleTypeFromSourceType } from '@videojs/vhs-utils/dist/media-types';
import resolveUrl from '@videojs/vhs-utils/dist/resolve-url.js';

/**
 * Parses a manifest string into a VHS supported manifest object.
 *
 * @param {Object} config
 *        Object containing arguments
 * @param {string} config.url
 *        URL to the manifest
 * @param {string} config.manifestString
 *        The manifest itself
 * @param {string} config..mimeType
 *        Mime type of the manifest
 *
 * @return {Object}
 *          A VHS manifest object
 */
export const parseManifest = ({ url, manifestString, mimeType }) => {
  const type = simpleTypeFromSourceType(mimeType);

  if (type === 'dash') {
    return parseMasterXml({
      masterXml: manifestString,
      srcUrl: url,
      clientOffset: 0
    });
  }

  const manifest = parseHlsManifest({
    manifestString,
    src: url
  });

  if (manifest.playlists) {
    manifest.playlists.forEach((playlist) => {
      playlist.resolvedUri = resolveUrl(url, playlist.uri);

      // For HLS playlists, media playlist segment lists are not yet available. However,
      // they shouldn't be requested yet, as that will lead to a lot of request time to
      // download all of the manifests, and only one from each master is ultimately
      // needed.
    });
  } else {
    manifest.attributes = {};
    manifest.resolvedUri = url;
    manifest.segments.forEach((segment) => {
      resolveSegmentUris(segment, manifest.resolvedUri);
    });
  }

  return manifest;
};
