import QUnit from 'qunit';
import {
  createInitializeMediaKeysFunction,
  createInitializeKeySystemsFunction
} from '../src/drm';

QUnit.module('createInitializeMediaKeysFunction');

QUnit.test('returns function that calls player.eme.initializeMediaKeys', function(assert) {
  assert.expect(1);

  const getLicense = () => {};
  const initializeMediaKeysFunction = createInitializeMediaKeysFunction({
    pssh: 'test-pssh',
    audioContentType: 'test-audioContentType',
    videoContentType: 'test-videoContentType',
    url: 'test-url',
    getLicense
  });
  const player = {
    eme: {
      initializeMediaKeys: (options) => {
        assert.deepEqual(
          options,
          {
            keySystems: {
              'com.widevine.alpha': {
                audioContentType: 'test-audioContentType',
                videoContentType: 'test-videoContentType',
                pssh: 'test-pssh',
                url: 'test-url',
                getLicense
              }
            }
          },
          'initializeMediaKeys called with proper options'
        );
      }
    }
  };

  initializeMediaKeysFunction(player);
});

QUnit.module('createInitializeKeySystemsFunction');

QUnit.test('returns falsey value if there are no key system objects', function(assert) {
  assert.notOk(
    createInitializeKeySystemsFunction({
      videoPlaylists: [{
        contentProtection: { 'com.widevine.alpha': { pssh: 'test-pssh' } }
      }, {
        contentProtection: { 'com.widevine.alpha': { pssh: 'test-pssh2' } }
      }],
      audioPlaylists: [{
        contentProtection: { 'com.widevine.alpha': { pssh: 'test-pssh3' } }
      }, {
        contentProtection: { 'com.widevine.alpha': { pssh: 'test-pssh4' } }
      }],
      audioAndVideoTypes: [{
        audio: 'audio/mp4; codecs="mp4a.40.2"',
        video: 'video/mp4; codecs="avc1.42001f"'
      }, {
        audio: 'audio/mp4; codecs="mp4a.40.5"',
        video: 'video/mp4; codecs="avc1.42001e"'
      }],
      keySystems: []
    }),
    'returned falsey value when there are no encrypted sources'
  );
});

QUnit.test('returns function if there are key system objects', function(assert) {
  const initializeKeySystemsFunction = createInitializeKeySystemsFunction({
    videoPlaylists: [{
      contentProtection: { 'com.widevine.alpha': { pssh: 'test-pssh' } }
    }, {
      contentProtection: { 'com.widevine.alpha': { pssh: 'test-pssh2' } }
    }],
    audioPlaylists: [{
      contentProtection: { 'com.widevine.alpha': { pssh: 'test-pssh3' } }
    }, {
      contentProtection: { 'com.widevine.alpha': { pssh: 'test-pssh4' } }
    }],
    audioAndVideoTypes: [{
      audio: 'audio/mp4; codecs="mp4a.40.2"',
      video: 'video/mp4; codecs="avc1.42001f"'
    }, {
      audio: 'audio/mp4; codecs="mp4a.40.5"',
      video: 'video/mp4; codecs="avc1.42001e"'
    }],
    keySystems: [{
      'com.widevine.alpha': 'license-url1'
    }, {
      'com.widevine.alpha': {
        url: 'license-url2'
      }
    }]
  });

  const initializeMediaKeysCalls = [];
  const player =
    { eme: { initializeMediaKeys: (options) => initializeMediaKeysCalls.push(options) } };

  initializeKeySystemsFunction(player);

  assert.deepEqual(
    initializeMediaKeysCalls,
    [
      {
        keySystems: {
          'com.widevine.alpha': {
            audioContentType: 'audio/mp4; codecs="mp4a.40.2"',
            videoContentType: 'video/mp4; codecs="avc1.42001f"',
            pssh: 'test-pssh',
            url: 'license-url1'
          }
        }
      },
      {
        keySystems: {
          'com.widevine.alpha': {
            audioContentType: 'audio/mp4; codecs="mp4a.40.2"',
            videoContentType: 'video/mp4; codecs="avc1.42001f"',
            pssh: 'test-pssh3',
            url: 'license-url1'
          }
        }
      },
      {
        keySystems: {
          'com.widevine.alpha': {
            audioContentType: 'audio/mp4; codecs="mp4a.40.5"',
            videoContentType: 'video/mp4; codecs="avc1.42001e"',
            pssh: 'test-pssh2',
            url: 'license-url2'
          }
        }
      },
      {
        keySystems: {
          'com.widevine.alpha': {
            audioContentType: 'audio/mp4; codecs="mp4a.40.5"',
            videoContentType: 'video/mp4; codecs="avc1.42001e"',
            pssh: 'test-pssh4',
            url: 'license-url2'
          }
        }
      }
    ],
    'returned function that initializes encrypted sources'
  );
});

QUnit.test('returns function if there is one key system object', function(assert) {
  const getLicense = () => {};
  const initializeKeySystemsFunction = createInitializeKeySystemsFunction({
    videoPlaylists: [{
      contentProtection: { 'com.widevine.alpha': { pssh: 'test-pssh' } }
    }, {
      contentProtection: { 'com.widevine.alpha': { pssh: 'test-pssh2' } }
    }],
    audioPlaylists: [{
      contentProtection: { 'com.widevine.alpha': { pssh: 'test-pssh3' } }
    }, {
      contentProtection: { 'com.widevine.alpha': { pssh: 'test-pssh4' } }
    }],
    audioAndVideoTypes: [{
      audio: 'audio/mp4; codecs="mp4a.40.2"',
      video: 'video/mp4; codecs="avc1.42001f"'
    }, {
      audio: 'audio/mp4; codecs="mp4a.40.5"',
      video: 'video/mp4; codecs="avc1.42001e"'
    }],
    keySystems: [
      void 0,
      { 'com.widevine.alpha': { getLicense } }
    ]
  });

  const initializeMediaKeysCalls = [];
  const player =
    { eme: { initializeMediaKeys: (options) => initializeMediaKeysCalls.push(options) } };

  initializeKeySystemsFunction(player);

  assert.deepEqual(
    initializeMediaKeysCalls,
    [
      {
        keySystems: {
          'com.widevine.alpha': {
            audioContentType: 'audio/mp4; codecs="mp4a.40.5"',
            videoContentType: 'video/mp4; codecs="avc1.42001e"',
            pssh: 'test-pssh2',
            getLicense
          }
        }
      },
      {
        keySystems: {
          'com.widevine.alpha': {
            audioContentType: 'audio/mp4; codecs="mp4a.40.5"',
            videoContentType: 'video/mp4; codecs="avc1.42001e"',
            pssh: 'test-pssh4',
            getLicense
          }
        }
      }
    ],
    'returned function that initializes encrypted source'
  );
});

QUnit.test('only supports widevine', function(assert) {
  const getLicense = () => {};
  const initializeKeySystemsFunction = createInitializeKeySystemsFunction({
    videoPlaylists: [{
      contentProtection: { 'com.microsoft.playready': { pssh: 'test-pssh' } }
    }, {
      contentProtection: { 'com.widevine.alpha': { pssh: 'test-pssh2' } }
    }],
    audioPlaylists: [{
      contentProtection: { 'com.microsoft.playready': { pssh: 'test-pssh3' } }
    }, {
      contentProtection: { 'com.widevine.alpha': { pssh: 'test-pssh4' } }
    }],
    audioAndVideoTypes: [{
      audio: 'audio/mp4; codecs="mp4a.40.2"',
      video: 'video/mp4; codecs="avc1.42001f"'
    }, {
      audio: 'audio/mp4; codecs="mp4a.40.5"',
      video: 'video/mp4; codecs="avc1.42001e"'
    }],
    keySystems: [
      { 'com.microsoft.playready': { getLicense } },
      { 'com.widevine.alpha': { getLicense } }
    ]
  });

  const initializeMediaKeysCalls = [];
  const player =
    { eme: { initializeMediaKeys: (options) => initializeMediaKeysCalls.push(options) } };

  initializeKeySystemsFunction(player);

  assert.deepEqual(
    initializeMediaKeysCalls,
    [
      {
        keySystems: {
          'com.widevine.alpha': {
            audioContentType: 'audio/mp4; codecs="mp4a.40.5"',
            videoContentType: 'video/mp4; codecs="avc1.42001e"',
            pssh: 'test-pssh2',
            getLicense
          }
        }
      },
      {
        keySystems: {
          'com.widevine.alpha': {
            audioContentType: 'audio/mp4; codecs="mp4a.40.5"',
            videoContentType: 'video/mp4; codecs="avc1.42001e"',
            pssh: 'test-pssh4',
            getLicense
          }
        }
      }
    ],
    'returned function that initializes only widevine encrypted source'
  );
});

QUnit.test('requires codec info', function(assert) {
  const getLicense = () => {};
  const initializeKeySystemsFunction = createInitializeKeySystemsFunction({
    videoPlaylists: [{
      contentProtection: { 'com.widevine.alpha': { pssh: 'test-pssh' } }
    }, {
      contentProtection: { 'com.widevine.alpha': { pssh: 'test-pssh2' } }
    }],
    audioPlaylists: [{
      contentProtection: { 'com.widevine.alpha': { pssh: 'test-pssh3' } }
    }, {
      contentProtection: { 'com.widevine.alpha': { pssh: 'test-pssh4' } }
    }],
    audioAndVideoTypes: [
      {},
      {
        audio: 'audio/mp4; codecs="mp4a.40.5"',
        video: 'video/mp4; codecs="avc1.42001e"'
      }
    ],
    keySystems: [
      { 'com.widevine.alpha': { getLicense } },
      { 'com.widevine.alpha': { getLicense } }
    ]
  });

  const initializeMediaKeysCalls = [];
  const player =
    { eme: { initializeMediaKeys: (options) => initializeMediaKeysCalls.push(options) } };

  initializeKeySystemsFunction(player);

  assert.deepEqual(
    initializeMediaKeysCalls,
    [
      {
        keySystems: {
          'com.widevine.alpha': {
            audioContentType: 'audio/mp4; codecs="mp4a.40.5"',
            videoContentType: 'video/mp4; codecs="avc1.42001e"',
            pssh: 'test-pssh2',
            getLicense
          }
        }
      },
      {
        keySystems: {
          'com.widevine.alpha': {
            audioContentType: 'audio/mp4; codecs="mp4a.40.5"',
            videoContentType: 'video/mp4; codecs="avc1.42001e"',
            pssh: 'test-pssh4',
            getLicense
          }
        }
      }
    ],
    'returned function that initializes only encrypted source with codec info'
  );
});
