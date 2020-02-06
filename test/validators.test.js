import QUnit from 'qunit';
import { removeUnsupportedPlaylists } from '../src/validators';

QUnit.module('removeUnsupportedPlaylists');

QUnit.test('removes manifests with only audio or video', function(assert) {
  assert.deepEqual(
    removeUnsupportedPlaylists([{
      playlists: [
        { resolvedUri: '1-1', attributes: { CODECS: 'avc1.4d400d' } },
        { resolvedUri: '1-2', attributes: { CODECS: 'mp4a.40.2' } },
        { resolvedUri: '1-3', attributes: { CODECS: 'avc1.4d400d, mp4a.40.2' } }
      ]
    }, {
      playlists: [
        { resolvedUri: '2-1', attributes: { CODECS: 'avc1.4d400d' } },
        { resolvedUri: '2-2', attributes: { CODECS: 'mp4a.40.2' } },
        { resolvedUri: '2-3', attributes: { CODECS: 'avc1.4d400d, mp4a.40.2' } }
      ]
    }]),
    [
      [ { resolvedUri: '1-3', attributes: { CODECS: 'avc1.4d400d, mp4a.40.2' } } ],
      [ { resolvedUri: '2-3', attributes: { CODECS: 'avc1.4d400d, mp4a.40.2' } } ]
    ],
    'removed audio and video only playlists'
  );
});

QUnit.test('removes playlists without MSE supported video codec', function(assert) {
  assert.deepEqual(
    removeUnsupportedPlaylists([{
      playlists: [
        // note that Safari will report some video codecs as supported, for instance:
        // avc1.4d400fake will report as supported
        { resolvedUri: '1-1', attributes: { CODECS: 'avc.4d400dfake, mp4a.40.2' } },
        { resolvedUri: '1-2', attributes: { CODECS: 'avc1.4d400d, mp4a.40.2' } }
      ]
    }, {
      playlists: [
        { resolvedUri: '2-1', attributes: { CODECS: 'avc.4d400fake, mp4a.40.2' } },
        { resolvedUri: '2-3', attributes: { CODECS: 'avc1.4d400d, mp4a.40.2' } }
      ]
    }]),
    [
      [ { resolvedUri: '1-2', attributes: { CODECS: 'avc1.4d400d, mp4a.40.2' } } ],
      [ { resolvedUri: '2-3', attributes: { CODECS: 'avc1.4d400d, mp4a.40.2' } } ]
    ],
    'removed playlists without MSE supported video codec'
  );
});

QUnit.test('passes through playlists without attributes object', function(assert) {
  assert.deepEqual(
    removeUnsupportedPlaylists([{
      playlists: [
        // Technically an attributes object and codec info should be required, but for now
        // it's easier to be safe and pass through those playlists rather than auto-fail.
        // This can be reconsidered in the future.
        { resolvedUri: '1-1' }
      ]
    }, {
      playlists: [
        { resolvedUri: '2-1', attributes: { CODECS: 'avc1.4d400d, mp4a.40.2' } }
      ]
    }]),
    [
      [ { resolvedUri: '1-1' } ],
      [ { resolvedUri: '2-1', attributes: { CODECS: 'avc1.4d400d, mp4a.40.2' } } ]
    ],
    'passed through playlists without attributes object'
  );
});

QUnit.test('passes through playlists without codecs attribute', function(assert) {
  assert.deepEqual(
    removeUnsupportedPlaylists([{
      playlists: [
        // Technically codec info should be required, but for now it's easier to be safe
        // and pass through those playlists rather than auto-fail. This can be
        // reconsidered in the future.
        { resolvedUri: '1-1', attributes: {} }
      ]
    }, {
      playlists: [
        { resolvedUri: '2-1', attributes: { CODECS: 'avc1.4d400d, mp4a.40.2' } }
      ]
    }]),
    [
      [ { resolvedUri: '1-1', attributes: {} } ],
      [ { resolvedUri: '2-1', attributes: { CODECS: 'avc1.4d400d, mp4a.40.2' } } ]
    ],
    'passed through playlists without codecs attribute'
  );
});

