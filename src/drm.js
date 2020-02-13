import videojs from 'video.js';

const WIDEVINE_KEY_SYSTEM_STRING = 'com.widevine.alpha';

/**
 * Creates a function that initializes media key sessions in videojs-contrib-eme
 *
 * @param {string} pssh
 *        The Program System Specific Header for the session
 * @param {string} audioContentType
 *        The audio MIME type, including codec info
 *        @see {@link https://www.w3.org/TR/html51/semantics-embedded-content.html#mime-types|Mime Types}
 * @param {string} videoContentType
 *        The video MIME type, including codec info
 *        @see {@link https://www.w3.org/TR/html51/semantics-embedded-content.html#mime-types|Mime Types}
 * @param {string} [url]
 *        URL to the license
 * @param {function()} [getLicense]
 *        Function to retrieve the license
 * @return {function()}
 *         Function that initializes media key session in videojs-contrib-eme
 */
export const createInitializeMediaKeysFunction = ({
  pssh,
  audioContentType,
  videoContentType,
  url,
  getLicense
}) => {
  return (player) => {
    const widevineConfig = {
      audioContentType,
      videoContentType,
      pssh
    };

    if (url) {
      widevineConfig.url = url;
    }
    if (getLicense) {
      widevineConfig.getLicense = getLicense;
    }

    player.eme.initializeMediaKeys({
      keySystems: {
        'com.widevine.alpha': widevineConfig
      }
    });
  };
};

/**
 * Returns a function that initializes all key sessions for EME and configures
 * videojs-contrib-eme to retrieve licenses for encrypted content. This function is meant
 * to be called after setting a player source to ensure that the session is associated
 * with the source.
 *
 * @param {Object[]} videoPlaylists
 *        An array of video playlists
 * @param {Object[]} audioPlaylists
 *        An array of audio playlists
 * @param {AudioAndVideoTypes[]} audioAndVideoTypes
 *        An array of audio and video MIME types with codecs
 *        @see {@link https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemmediacapability-contenttype|contentType}
 *        @see {@link https://www.w3.org/TR/html51/semantics-embedded-content.html#mime-types|Mime Types}
 * @param {KeySystems[]} keySystems
 *        An array of KeySystems objects
 * @return {function()|null} initializeKeySystems
 *         Function to call after setting source to initialize EME for DRMed sources, or
 *         null if the function can't be setup
 */
export const createInitializeKeySystemsFunction = ({
  videoPlaylists,
  audioPlaylists,
  audioAndVideoTypes,
  keySystems
}) => {
  const containsEncryptedSource = keySystems.reduce((acc, keySystem) => {
    return acc || !!keySystem;
  }, false);

  if (!containsEncryptedSource) {
    return null;
  }

  const initializeKeySystemsFunctions = [];

  // video and audio playlist counts should match, so either length can be used
  for (let i = 0; i < videoPlaylists.length; i++) {
    const keySystemsConfig = keySystems[i];

    // this handles both the case of no DRMed content and DRMed mixed with unencrypted
    // content
    if (!keySystemsConfig) {
      continue;
    }

    const widevineKeySystem = keySystemsConfig[WIDEVINE_KEY_SYSTEM_STRING];

    // at the moment, only widevine is supported
    if (!widevineKeySystem) {
      continue;
    }

    if (
      !audioAndVideoTypes[i] ||
      !(audioAndVideoTypes[i].video || audioAndVideoTypes[i].audio)
    ) {
      // Need to have the MIME types for the capabilities configuration of
      // requestMediaKeySystemAccess. If they are not available, skip the configuration.
      //
      // @see {@link https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemmediacapability-contenttype|contentType}
      continue;
    }

    // widevineKeySystem config object is either a string (representing a URL) or an
    // object (containing either a URL or a getLicense function)
    const url =
      typeof widevineKeySystem === 'object' ? widevineKeySystem.url : widevineKeySystem;
    const getLicense =
      typeof widevineKeySystem === 'object' ? widevineKeySystem.getLicense : null;
    const videoPlaylist = videoPlaylists[i];
    const audioPlaylist = audioPlaylists[i];
    const videoPssh = videoPlaylist.contentProtection &&
      videoPlaylist.contentProtection[WIDEVINE_KEY_SYSTEM_STRING] ?
      videoPlaylist.contentProtection[WIDEVINE_KEY_SYSTEM_STRING].pssh : null;
    const audioPssh = audioPlaylist.contentProtection &&
      audioPlaylist.contentProtection[WIDEVINE_KEY_SYSTEM_STRING] ?
      audioPlaylist.contentProtection[WIDEVINE_KEY_SYSTEM_STRING].pssh : null;
    const audioType = audioAndVideoTypes[i].audio;
    const videoType = audioAndVideoTypes[i].video;
    const commonOptions = {
      audioContentType: audioType,
      videoContentType: videoType
    };

    // audio and video share the same function and URL, as there aren't separate
    // audio/video params available in VHS yet
    if (url) {
      commonOptions.url = url;
    }
    if (getLicense) {
      commonOptions.getLicense = getLicense;
    }

    // if audio and video have the same pssh, videojs-contrib-eme will dedupe
    if (videoPssh) {
      const options = videojs.mergeOptions(commonOptions, { pssh: videoPssh });

      initializeKeySystemsFunctions.push(createInitializeMediaKeysFunction(options));
    }

    if (audioPssh) {
      const options = videojs.mergeOptions(commonOptions, { pssh: audioPssh });

      initializeKeySystemsFunctions.push(createInitializeMediaKeysFunction(options));
    }
  }

  return (player) => {
    initializeKeySystemsFunctions.forEach((initializeKeySystemsFunction) => {
      initializeKeySystemsFunction(player);
    });
  };
};
