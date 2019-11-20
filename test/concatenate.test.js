import QUnit from 'qunit';
import sinon from 'sinon';
import videojs from 'video.js';
import window from 'global/window';
import {
  concatenateVideos,
  resolvePlaylists
} from '../src/concatenate';
import {
  hlsMasterPlaylist,
  hlsMediaPlaylist,
  dashPlaylist
} from './test-helpers/manifest-generators';

const STANDARD_HEADERS = { 'Content-Type': 'text/plain' };

const concatenateVideosPromise = ({ manifests, targetVerticalResolution }) => {
  return new Promise((accept, reject) => {
    concatenateVideos({
      manifests,
      targetVerticalResolution,
      callback: (err, sourceObject) => {
        if (err) {
          reject(err);
          return;
        }

        accept(sourceObject);
      }
    });
  });
};

QUnit.module('concatenate-videos', {
  beforeEach() {
    this.realXhr = videojs.xhr.XMLHttpRequest;
    this.server = sinon.fakeServer.create();
    videojs.xhr.XMLHttpRequest = this.server.xhr;
    this.server.autoRespond = true;
  },

  afterEach() {
    this.server.restore();
    videojs.xhr.XMLHttpRequest = this.realXhr;
  }
});

QUnit.test('concatenates multiple videos into one', function(assert) {
  const done = assert.async();
  const manifests = [{
    url: '/manifest1.m3u8',
    mimeType: 'application/vnd.apple.mpegurl'
  }, {
    url: '/manifest2.m3u8',
    mimeType: 'application/x-mpegurl'
  }];

  this.server.respondWith(
    'GET',
    manifests[0].url,
    [200, STANDARD_HEADERS, hlsMediaPlaylist({ numSegments: 1 })]
  );
  this.server.respondWith(
    'GET',
    manifests[1].url,
    [200, STANDARD_HEADERS, hlsMediaPlaylist({ segmentPrefix: 'm2s', numSegments: 1 })]
  );

  concatenateVideosPromise({
    manifests,
    targetVideoResolution: 720
  }).then((sourceObject) => {
    assert.deepEqual(
      sourceObject,
      {
        manifestObject: {
          uri: window.location.href,
          mediaGroups: {
            'AUDIO': {},
            'VIDEO': {},
            'CLOSED-CAPTIONS': {},
            'SUBTITLES': {}
          },
          playlists: [{
            attributes: {},
            uri: 'combined-playlist',
            resolvedUri: 'combined-playlist',
            endList: true,
            mediaSequence: 0,
            discontinuitySequence: 0,
            playlistType: 'VOD',
            targetDuration: 10,
            discontinuityStarts: [1],
            segments: [{
              duration: 10,
              timeline: 0,
              number: 0,
              uri: '0.ts',
              resolvedUri: `${window.location.origin}/0.ts`
            }, {
              duration: 10,
              discontinuity: true,
              timeline: 1,
              number: 1,
              uri: 'm2s0.ts',
              resolvedUri: `${window.location.origin}/m2s0.ts`
            }]
          }]
        }
      },
      'created concatenated video object'
    );
    done();
  }).catch((e) => {
    assert.ok(false, e);
    done();
  });
});

QUnit.test('concatenates HLS and DASH sources together', function(assert) {
  const done = assert.async();
  const manifests = [{
    url: '/manifest1.m3u8',
    mimeType: 'application/vnd.apple.mpegurl'
  }, {
    url: '/dash.mpd',
    mimeType: 'application/dash+xml'
  }];

  this.server.respondWith(
    'GET',
    manifests[0].url,
    [
      200,
      STANDARD_HEADERS,
      hlsMasterPlaylist({
        includeDemuxedAudio: true
      })
    ]
  );
  this.server.respondWith(
    'GET',
    manifests[0].url,
    [200, STANDARD_HEADERS, hlsMasterPlaylist({ includeDemuxedAudio: true })]
  );
  this.server.respondWith(
    'GET',
    '/playlist0.m3u8',
    [200, STANDARD_HEADERS, hlsMediaPlaylist({ numSegments: 1 })]
  );
  this.server.respondWith(
    'GET',
    '/playlist-audio.m3u8',
    [200, STANDARD_HEADERS, hlsMediaPlaylist({ numSegments: 1, segmentPrefix: 'audio' })]
  );
  this.server.respondWith(
    'GET',
    manifests[1].url,
    [200, STANDARD_HEADERS, dashPlaylist({ numSegments: 1 })]
  );

  const expectedAudioPlaylist = {
    attributes: {
      // bandwidth from the DASH playlist
      BANDWIDTH: 128000,
      // codecs from the DASH playlist (first playlist with CODECS attribute)
      CODECS: 'mp4a.40.2'
    },
    discontinuitySequence: 0,
    discontinuityStarts: [1],
    endList: true,
    mediaSequence: 0,
    playlistType: 'VOD',
    uri: 'combined-playlist-audio',
    resolvedUri: 'combined-playlist-audio',
    targetDuration: 10,
    segments: [{
      duration: 10,
      resolvedUri: `${window.location.origin}/audio0.ts`,
      timeline: 0,
      number: 0,
      uri: 'audio0.ts'
    }, {
      discontinuity: true,
      duration: 10,
      map: {
        uri: 'audio-init.mp4',
        resolvedUri: `${window.location.origin}/main/audio/720/audio-init.mp4`
      },
      number: 1,
      timeline: 1,
      uri: 'segment-0.mp4',
      resolvedUri: `${window.location.origin}/main/audio/720/segment-0.mp4`
    }]
  };
  const expectedAudioPlaylists = [expectedAudioPlaylist];

  expectedAudioPlaylists['combined-playlist-audio'] = expectedAudioPlaylist;

  concatenateVideosPromise({
    manifests,
    targetVideoResolution: 720
  }).then((sourceObject) => {
    assert.deepEqual(
      sourceObject,
      {
        manifestObject: {
          uri: window.location.href,
          mediaGroups: {
            'AUDIO': {
              audio: {
                default: {
                  autoselect: true,
                  default: true,
                  language: '',
                  playlists: expectedAudioPlaylists,
                  uri: 'combined-audio-playlists'
                }
              }
            },
            'VIDEO': {},
            'CLOSED-CAPTIONS': {},
            'SUBTITLES': {}
          },
          playlists: [{
            attributes: {
              // bandwidth from the DASH playlist
              BANDWIDTH: 6800000,
              // codecs from the DASH playlist (first playlist with CODECS attribute)
              CODECS: 'avc1.420015',
              AUDIO: 'audio'
            },
            uri: 'combined-playlist',
            resolvedUri: 'combined-playlist',
            endList: true,
            mediaSequence: 0,
            discontinuitySequence: 0,
            playlistType: 'VOD',
            targetDuration: 10,
            discontinuityStarts: [1],
            segments: [{
              duration: 10,
              timeline: 0,
              uri: '0.ts',
              number: 0,
              resolvedUri: `${window.location.origin}/0.ts`
            }, {
              duration: 10,
              discontinuity: true,
              timeline: 1,
              number: 1,
              map: {
                uri: '1080p-init.mp4',
                resolvedUri: `${window.location.origin}/main/video/1080/1080p-init.mp4`
              },
              uri: '1080p-segment-0.mp4',
              resolvedUri: `${window.location.origin}/main/video/1080/1080p-segment-0.mp4`
            }]
          }]
        }
      },
      'created concatenated video object'
    );
    done();
  }).catch((e) => {
    assert.ok(false, e);
    done();
  });
});

QUnit.test('calls back with an error when no manifests passed in', function(assert) {
  const done = assert.async();

  concatenateVideosPromise({
    manifests: [],
    targetVideoResolution: 720
  }).catch((error) => {
    assert.equal(
      error.message,
      'No sources provided',
      'called back with correct error message'
    );
    done();
  });
});

QUnit.test('calls back with error when a manifest doesn\'t include a URL', function(assert) {
  const done = assert.async();

  concatenateVideosPromise({
    manifests: [{
      url: '/manifest1.m3u8',
      mimeType: 'application/vnd.apple.mpegurl'
    }, {
      mimeType: 'application/x-mpegurl'
    }],
    targetVideoResolution: 720
  }).catch((error) => {
    assert.equal(
      error.message,
      'All manifests must include a URL',
      'called back with correct error message'
    );
    done();
  });
});

QUnit.test('calls back with an error when a manifest doesn\'t include a mime type', function(assert) {
  const done = assert.async();

  concatenateVideosPromise({
    manifests: [{
      url: '/manifest1.m3u8',
      mimeType: 'application/vnd.apple.mpegurl'
    }, {
      url: '/manifest2.m3u8'
    }],
    targetVideoResolution: 720
  }).catch((error) => {
    assert.equal(
      error.message,
      'All manifests must include a mime type',
      'called back with correct error message'
    );
    done();
  });
});

QUnit.test('calls back with an error on request failure', function(assert) {
  const done = assert.async();
  const manifests = [{
    url: '/manifest1.m3u8',
    mimeType: 'application/vnd.apple.mpegurl'
  }, {
    url: '/manifest2.m3u8',
    mimeType: 'application/x-mpegurl'
  }];

  this.server.respondWith(
    'GET',
    manifests[0].url,
    [200, STANDARD_HEADERS, hlsMediaPlaylist({ numSegments: 1 })]
  );
  this.server.respondWith('GET', manifests[1].url, [500, STANDARD_HEADERS, '']);

  concatenateVideosPromise({
    manifests,
    targetVideoResolution: 720
  }).catch((error) => {
    assert.equal(
      error.message,
      'Request failed',
      'called back with correct error message'
    );
    assert.equal(error.request.status, 500, 'called back with correct error status');
    done();
  });
});

QUnit.module('resolvePlaylists', {
  beforeEach() {
    this.realXhr = videojs.xhr.XMLHttpRequest;
    this.server = sinon.fakeServer.create();
    videojs.xhr.XMLHttpRequest = this.server.xhr;
    this.server.autoRespond = true;
  },

  afterEach() {
    this.server.restore();
    videojs.xhr.XMLHttpRequest = this.realXhr;
  }
});

QUnit.test('makes no requests when playlists already resolved', function(assert) {
  assert.expect(3);

  const done = assert.async();
  const playlists = [{
    resolvedUri: 'p1',
    segments: []
  }, {
    resolvedUri: 'p2',
    segments: []
  }, {
    resolvedUri: 'p3',
    segments: []
  }];
  const mimeTypes = [
    'application/x-mpegURL',
    'application/x-mpegURL',
    'application/dash+xml'
  ];

  resolvePlaylists({
    playlists,
    mimeTypes,
    callback: (err, playlistsToParsed) => {
      assert.notOk(err, 'no error');
      assert.equal(this.server.requests.length, 0, 'made no requests');
      assert.deepEqual(
        playlistsToParsed,
        {
          p1: {
            resolvedUri: 'p1',
            segments: []
          },
          p2: {
            resolvedUri: 'p2',
            segments: []
          },
          p3: {
            resolvedUri: 'p3',
            segments: []
          }
        },
        'returned playlists to parsed object'
      );
      done();
    }
  });
});

QUnit.test('makes requests for unresolved playlists', function(assert) {
  assert.expect(4);

  const done = assert.async();
  const playlists = [{
    resolvedUri: 'p1',
    segments: []
  }, {
    resolvedUri: 'p2'
  }, {
    resolvedUri: 'p3',
    segments: []
  }];
  const mimeTypes = [
    'application/x-mpegURL',
    'application/x-mpegURL',
    'application/dash+xml'
  ];

  this.server.respondWith(
    'GET',
    'p2',
    [200, STANDARD_HEADERS, hlsMediaPlaylist({ numSegments: 1 })]
  );

  resolvePlaylists({
    playlists,
    mimeTypes,
    callback: (err, playlistsToParsed) => {
      assert.notOk(err, 'no error');
      assert.equal(this.server.requests.length, 1, 'made one request');
      assert.equal(this.server.requests[0].url, 'p2', 'made request for p2');
      assert.deepEqual(
        playlistsToParsed,
        {
          p1: {
            resolvedUri: 'p1',
            segments: []
          },
          p2: {
            allowCache: true,
            attributes: {},
            discontinuitySequence: 0,
            discontinuityStarts: [],
            endList: true,
            playlistType: 'VOD',
            uri: 'p2',
            resolvedUri: 'p2',
            mediaSequence: 0,
            targetDuration: 10,
            segments: [{
              duration: 10,
              resolvedUri: `${window.location.origin}/test/0.ts`,
              timeline: 0,
              uri: '0.ts'
            }]
          },
          p3: {
            resolvedUri: 'p3',
            segments: []
          }
        },
        'resolved and parsed unresolved playlist'
      );
      done();
    }
  });
});

QUnit.test('calls back with error if a playlist errors', function(assert) {
  assert.expect(3);

  const done = assert.async();
  const playlists = [{
    resolvedUri: 'p1',
    segments: []
  }, {
    resolvedUri: 'p2'
  }, {
    resolvedUri: 'p3'
  }];
  const mimeTypes = [
    'application/x-mpegURL',
    'application/x-mpegURL',
    'application/dash+xml'
  ];

  this.server.respondWith(
    'GET',
    'p2',
    [200, STANDARD_HEADERS, hlsMediaPlaylist({ numSegments: 1 })]
  );
  this.server.respondWith('GET', 'p3', [500, STANDARD_HEADERS, '']);

  resolvePlaylists({
    playlists,
    mimeTypes,
    callback: (err, playlistsToParsed) => {
      assert.ok(err, 'called back with error');
      assert.equal(err.message, 'Request failed', 'correct error message');
      assert.notOk(playlistsToParsed, 'did not pass back a result object');
      done();
    }
  });
});
