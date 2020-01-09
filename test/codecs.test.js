import QUnit from 'qunit';
import {
  codecsForPlaylists,
  getAudioAndVideoTypes
} from '../src/codecs';

QUnit.module('codecsForPlaylists');

QUnit.test('returns object associating playlists to codecs', function(assert) {
  const manifest = {
    playlists: [{
      resolvedUri: 'test1',
      attributes: {
        CODECS: 'avc1.4d400d, mp4a.40.2'
      }
    }, {
      resolvedUri: 'test2',
      attributes: {
        CODECS: 'mp4a.40.5,avc1.4d401e'
      }
    }]
  };

  assert.deepEqual(
    codecsForPlaylists(manifest),
    {
      test1: {
        codecCount: 2,
        audioProfile: '2',
        videoCodec: 'avc1',
        videoObjectTypeIndicator: '.4d400d'
      },
      test2: {
        codecCount: 2,
        audioProfile: '5',
        videoCodec: 'avc1',
        videoObjectTypeIndicator: '.4d401e'
      }
    },
    'returned object associating playlists to codecs'
  );
});

QUnit.test('uses audio codec from default alt audio playlist', function(assert) {
  const manifest = {
    mediaGroups: {
      AUDIO: {
        au1: {
          en: {
            default: false,
            playlists: [{
              attributes: { CODECS: 'mp4a.40.2' }
            }]
          },
          es: {
            default: true,
            playlists: [{
              attributes: { CODECS: 'mp4a.40.5' }
            }]
          }
        }
      }
    },
    playlists: [{
      resolvedUri: 'test1',
      attributes: {
        CODECS: 'avc1.4d400d',
        AUDIO: 'au1'
      }
    }, {
      resolvedUri: 'test2',
      attributes: {
        CODECS: 'avc1.4d401e',
        AUDIO: 'au1'
      }
    }]
  };

  assert.deepEqual(
    codecsForPlaylists(manifest),
    {
      test1: {
        codecCount: 2,
        audioProfile: '5',
        videoCodec: 'avc1',
        videoObjectTypeIndicator: '.4d400d'
      },
      test2: {
        codecCount: 2,
        audioProfile: '5',
        videoCodec: 'avc1',
        videoObjectTypeIndicator: '.4d401e'
      }
    },
    'used default audio codec for both playlists'
  );
});

QUnit.test(
  'does not use audio codec from non default alt audio playlist',
  function(assert) {
    const manifest = {
      mediaGroups: {
        AUDIO: {
          au1: {
            en: {
              default: false,
              playlists: [{
                attributes: { CODECS: 'mp4a.40.2' }
              }]
            },
            es: {
              default: false,
              playlists: [{
                attributes: { CODECS: 'mp4a.40.5' }
              }]
            }
          }
        }
      },
      playlists: [{
        resolvedUri: 'test1',
        attributes: {
          CODECS: 'avc1.4d400d',
          AUDIO: 'au1'
        }
      }, {
        resolvedUri: 'test2',
        attributes: {
          CODECS: 'avc1.4d401e',
          AUDIO: 'au1'
        }
      }]
    };

    assert.deepEqual(
      codecsForPlaylists(manifest),
      {
        test1: {
          codecCount: 1,
          audioProfile: null,
          videoCodec: 'avc1',
          videoObjectTypeIndicator: '.4d400d'
        },
        test2: {
          codecCount: 1,
          audioProfile: null,
          videoCodec: 'avc1',
          videoObjectTypeIndicator: '.4d401e'
        }
      },
      'did not use non default audio codec for either playlist'
    );
  }
);

QUnit.module('getAudioAndVideoTypes');

QUnit.test('gets muxed video and audio mime types and codecs', function(assert) {
  assert.deepEqual(
    getAudioAndVideoTypes({
      videoPlaylists: [
        { resolvedUri: 'manifest1-playlist2' },
        { resolvedUri: 'manifest2-playlist1' }
      ],
      manifestObjects: [{
        playlists: [{
          attributes: { CODECS: 'avc1.42001e, mp4a.40.2' },
          resolvedUri: 'manifest1-playlist1'
        }, {
          attributes: { CODECS: 'avc1.42001f, mp4a.40.5' },
          resolvedUri: 'manifest1-playlist2'
        }]
      }, {
        playlists: [{
          attributes: { CODECS: 'avc1.42001e, mp4a.40.2' },
          resolvedUri: 'manifest2-playlist1'
        }, {
          attributes: { CODECS: 'avc1.42001f, mp4a.40.5' },
          resolvedUri: 'manifest2-playlist2'
        }]
      }]
    }),
    [
      {
        video: 'video/mp4; codecs="avc1.42001f"',
        audio: 'audio/mp4; codecs="mp4a.40.5"'
      },
      {
        video: 'video/mp4; codecs="avc1.42001e"',
        audio: 'audio/mp4; codecs="mp4a.40.2"'
      }
    ],
    'got video and audio mime types and codecs'
  );
});

QUnit.test('gets video only mime type and codec', function(assert) {
  assert.deepEqual(
    getAudioAndVideoTypes({
      videoPlaylists: [
        { resolvedUri: 'manifest1-playlist2' },
        { resolvedUri: 'manifest2-playlist1' }
      ],
      manifestObjects: [{
        playlists: [{
          attributes: { CODECS: 'avc1.42001f' },
          resolvedUri: 'manifest1-playlist1'
        }, {
          attributes: { CODECS: 'avc1.42001e' },
          resolvedUri: 'manifest1-playlist2'
        }]
      }, {
        playlists: [{
          attributes: { CODECS: 'avc1.42001f' },
          resolvedUri: 'manifest2-playlist1'
        }, {
          attributes: { CODECS: 'avc1.42001e' },
          resolvedUri: 'manifest2-playlist2'
        }]
      }]
    }),
    [
      { video: 'video/mp4; codecs="avc1.42001e"' },
      { video: 'video/mp4; codecs="avc1.42001f"' }
    ],
    'got video mime type and codec'
  );
});

QUnit.test('gets audio only mime type and codec', function(assert) {
  assert.deepEqual(
    getAudioAndVideoTypes({
      videoPlaylists: [
        { resolvedUri: 'manifest1-playlist2' },
        { resolvedUri: 'manifest2-playlist1' }
      ],
      manifestObjects: [{
        playlists: [{
          attributes: { CODECS: 'mp4a.40.2' },
          resolvedUri: 'manifest1-playlist1'
        }, {
          attributes: { CODECS: 'mp4a.40.5' },
          resolvedUri: 'manifest1-playlist2'
        }]
      }, {
        playlists: [{
          attributes: { CODECS: 'mp4a.40.2' },
          resolvedUri: 'manifest2-playlist1'
        }, {
          attributes: { CODECS: 'mp4a.40.2' },
          resolvedUri: 'manifest2-playlist2'
        }]
      }]
    }),
    [
      { audio: 'audio/mp4; codecs="mp4a.40.5"' },
      { audio: 'audio/mp4; codecs="mp4a.40.2"' }
    ],
    'got audio mime type and codec'
  );
});

QUnit.test('gets demuxed video and audio mime types and codecs', function(assert) {
  const mediaGroups = {
    AUDIO: {
      audio: {
        nonDefault: {
          autoselect: false,
          default: false,
          playlists: [{
            attributes: { CODECS: 'mp4a.40.2' }
          }]
        },
        default: {
          autoselect: true,
          default: true,
          playlists: [{
            attributes: { CODECS: 'mp4a.40.5' }
          }]
        }
      }
    }
  };

  assert.deepEqual(
    getAudioAndVideoTypes({
      videoPlaylists: [
        { resolvedUri: 'manifest1-playlist2' },
        { resolvedUri: 'manifest2-playlist1' }
      ],
      manifestObjects: [{
        mediaGroups,
        playlists: [{
          attributes: { CODECS: 'avc1.42001e', AUDIO: 'audio' },
          resolvedUri: 'manifest1-playlist1'
        }, {
          attributes: { CODECS: 'avc1.42001f', AUDIO: 'audio' },
          resolvedUri: 'manifest1-playlist2'
        }]
      }, {
        mediaGroups,
        playlists: [{
          attributes: { CODECS: 'avc1.42001e', AUDIO: 'audio' },
          resolvedUri: 'manifest2-playlist1'
        }, {
          attributes: { CODECS: 'avc1.42001f', AUDIO: 'audio' },
          resolvedUri: 'manifest2-playlist2'
        }]
      }]
    }),
    [
      {
        video: 'video/mp4; codecs="avc1.42001f"',
        audio: 'audio/mp4; codecs="mp4a.40.5"'
      },
      {
        video: 'video/mp4; codecs="avc1.42001e"',
        audio: 'audio/mp4; codecs="mp4a.40.5"'
      }
    ],
    'got video and audio mime types and codecs'
  );
});
