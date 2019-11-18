import QUnit from 'qunit';
import {
  combinePlaylists,
  constructMasterManifest
} from '../src/generators';
import window from 'global/window';

QUnit.module('combinePlaylists');

QUnit.test('uses max BANDWIDTH and first playlist CODECS attributes', function(assert) {
  const playlist1 = {
    attributes: {
      BANDWIDTH: 111,
      CODECS: 'avc1.4d400e, mp4a.40.5',
      extraFirst: 'test'
    },
    uri: '',
    segments: []
  };
  const playlist2 = {
    attributes: {
      BANDWIDTH: 112,
      CODECS: 'avc1.4d400d, mp4a.40.2',
      extraSecond: 'test'
    },
    uri: '',
    segments: []
  };
  const combinedPlaylist = combinePlaylists({ playlists: [playlist1, playlist2] });

  assert.deepEqual(
    combinedPlaylist.attributes,
    {
      BANDWIDTH: 112,
      CODECS: 'avc1.4d400e, mp4a.40.5'
    },
    'used CODECS attribute of the first playlist and largest BANDWIDTH attribute'
  );
});

QUnit.test('provides uri and resolvedUri', function(assert) {
  const playlist1 = {
    uri: 'uri1',
    segments: []
  };
  const playlist2 = {
    uri: 'uri2',
    segments: []
  };
  const combinedPlaylist = combinePlaylists({ playlists: [playlist1, playlist2] });

  assert.equal(
    combinedPlaylist.uri,
    'combined-playlist',
    'provided uri for combined playlist'
  );
  assert.equal(
    combinedPlaylist.resolvedUri,
    'combined-playlist',
    'provided resolvedUri for combined playlist'
  );
});

QUnit.test('uses largest target duration', function(assert) {
  const playlist1 = {
    uri: 'uri1',
    targetDuration: 10,
    segments: [{
      // segment duration should be ignored
      duration: 12
    }]
  };
  const playlist2 = {
    uri: 'uri2',
    targetDuration: 11,
    segments: [{
      // segment duration should be ignored
      duration: 13
    }]
  };
  const combinedPlaylist = combinePlaylists({ playlists: [playlist1, playlist2] });

  assert.equal(combinedPlaylist.targetDuration, 11, 'used largest target duration');
});

QUnit.test('adds discontinuity between playlists', function(assert) {
  const playlist1 = {
    uri: 'uri1',
    segments: [{
      uri: 'uri1-1.ts'
    }, {
      uri: 'uri1-2.ts'
    }]
  };
  const playlist2 = {
    uri: 'uri2',
    segments: [{
      uri: 'uri2-1.ts'
    }, {
      uri: 'uri2-2.ts'
    }]
  };
  const combinedPlaylist = combinePlaylists({ playlists: [playlist1, playlist2] });

  assert.deepEqual(
    combinedPlaylist.segments,
    [
      { uri: 'uri1-1.ts', number: 0, timeline: 0 },
      { uri: 'uri1-2.ts', number: 1, timeline: 0 },
      { discontinuity: true, uri: 'uri2-1.ts', number: 2, timeline: 1 },
      { uri: 'uri2-2.ts', number: 3, timeline: 1 }
    ],
    'added discontinuity between playlists'
  );
});

QUnit.test('ignores playlist timeline values', function(assert) {
  const playlist1 = {
    uri: 'uri1',
    segments: [{
      timeline: 3,
      uri: 'uri1-1.ts'
    }, {
      timeline: 3,
      uri: 'uri1-2.ts'
    }]
  };
  const playlist2 = {
    uri: 'uri2',
    segments: [{
      timeline: 7,
      uri: 'uri2-1.ts'
    }, {
      timeline: 7,
      uri: 'uri2-2.ts'
    }]
  };
  const combinedPlaylist = combinePlaylists({ playlists: [playlist1, playlist2] });

  assert.deepEqual(
    combinedPlaylist.segments,
    [
      { uri: 'uri1-1.ts', number: 0, timeline: 0 },
      { uri: 'uri1-2.ts', number: 1, timeline: 0 },
      { discontinuity: true, uri: 'uri2-1.ts', number: 2, timeline: 1 },
      { uri: 'uri2-2.ts', number: 3, timeline: 1 }
    ],
    'added discontinuity between playlists'
  );
});

QUnit.test('does not ignore discontinuity within playlist', function(assert) {
  const playlist1 = {
    uri: 'uri1',
    segments: [{
      timeline: 3,
      uri: 'uri1-1.ts'
    }, {
      timeline: 3,
      uri: 'uri1-2.ts'
    }]
  };
  const playlist2 = {
    uri: 'uri2',
    segments: [{
      timeline: 7,
      uri: 'uri2-1.ts'
    }, {
      discontinuity: true,
      timeline: 8,
      uri: 'uri2-2.ts'
    }]
  };
  const combinedPlaylist = combinePlaylists({ playlists: [playlist1, playlist2] });

  assert.deepEqual(
    combinedPlaylist.segments,
    [
      { uri: 'uri1-1.ts', number: 0, timeline: 0 },
      { uri: 'uri1-2.ts', number: 1, timeline: 0 },
      { discontinuity: true, uri: 'uri2-1.ts', number: 2, timeline: 1 },
      { discontinuity: true, uri: 'uri2-2.ts', number: 3, timeline: 2 }
    ],
    'made use of discontinuity within playlist'
  );
});

QUnit.module('constructMasterManifest');

QUnit.test('creates master manifest from sole video playlist', function(assert) {
  const videoPlaylist = {
    attributes: {},
    segments: [{
      uri: 'segment1.ts'
    }, {
      uri: 'segment2.ts'
    }]
  };

  assert.deepEqual(
    constructMasterManifest({ videoPlaylist }),
    {
      mediaGroups: {
        'AUDIO': {},
        'VIDEO': {},
        'CLOSED-CAPTIONS': {},
        'SUBTITLES': {}
      },
      uri: window.location.href,
      playlists: [{
        attributes: {},
        segments: [{
          uri: 'segment1.ts'
        }, {
          uri: 'segment2.ts'
        }]
      }]
    },
    'created master manifest'
  );
});

QUnit.test(
  'creates media groups with demuxed audio if audio playlist is present',
  function(assert) {
    const videoPlaylist = {
      attributes: {},
      segments: [{
        uri: 'segment1.ts'
      }, {
        uri: 'segment2.ts'
      }]
    };
    const audioPlaylist = {
      segments: [{
        uri: 'audio-segment1.ts'
      }, {
        uri: 'audio-segment2.ts'
      }, {
        uri: 'audio-segment.ts'
      }]
    };

    assert.deepEqual(
      constructMasterManifest({ videoPlaylist, audioPlaylist }),
      {
        mediaGroups: {
          'AUDIO': {
            audio: {
              default: {
                autoselect: true,
                default: true,
                language: '',
                uri: 'combined-audio-playlists',
                playlists: [{
                  segments: [{
                    uri: 'audio-segment1.ts'
                  }, {
                    uri: 'audio-segment2.ts'
                  }, {
                    uri: 'audio-segment.ts'
                  }]
                }]
              }
            }
          },
          'VIDEO': {},
          'CLOSED-CAPTIONS': {},
          'SUBTITLES': {}
        },
        uri: window.location.href,
        playlists: [{
          attributes: {
            AUDIO: 'audio'
          },
          segments: [{
            uri: 'segment1.ts'
          }, {
            uri: 'segment2.ts'
          }]
        }]
      },
      'created master manifest with demuxed audio'
    );
  }
);
