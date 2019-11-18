import QUnit from 'qunit';
import { codecsForPlaylists } from '../src/codecs';

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

