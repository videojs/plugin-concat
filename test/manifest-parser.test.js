import QUnit from 'qunit';

import { parseManifest } from '../src/manifest-parser';
import {
  hlsMasterPlaylist,
  hlsMediaPlaylist,
  dashPlaylist
} from './test-helpers/manifest-generators';

QUnit.module('manifest-parser');

QUnit.test('adds resolvedUri to media playlists of an HLS master', function(assert) {
  const manifestObject = parseManifest({
    url: 'http://test.com',
    manifestString: hlsMasterPlaylist({
      numPlaylists: 2
    }),
    mimeType: 'application/x-mpegURL'
  });

  assert.equal(manifestObject.playlists.length, 2, 'two playlists');
  assert.equal(
    manifestObject.playlists[0].resolvedUri,
    'http://test.com/playlist0.m3u8',
    'added resolvedUri to first media playlist'
  );
  assert.equal(
    manifestObject.playlists[1].resolvedUri,
    'http://test.com/playlist1.m3u8',
    'added resolvedUri to second media playlist'
  );
});

QUnit.test('adds resolvedUri to an HLS media manifest', function(assert) {
  const manifestObject = parseManifest({
    url: 'http://test.com',
    manifestString: hlsMediaPlaylist({}),
    mimeType: 'application/x-mpegURL'
  });

  assert.equal(
    manifestObject.resolvedUri,
    'http://test.com',
    'added resolvedUri property to manifest object'
  );
});

QUnit.test('adds resolvedUri to playlists of a DASH manifest', function(assert) {
  const manifestObject = parseManifest({
    url: 'http://test.com',
    manifestString: dashPlaylist({}),
    mimeType: 'application/dash+xml'
  });

  assert.equal(manifestObject.playlists.length, 2, 'two playlists');
  assert.equal(
    manifestObject.playlists[0].resolvedUri,
    'http://test.com/placeholder-uri-0',
    'added resolvedUri to playlist'
  );
  assert.equal(
    manifestObject.playlists[1].resolvedUri,
    'http://test.com/placeholder-uri-1',
    'added resolvedUri to playlist'
  );
});

QUnit.test('HLS master manifest media segment lists are not resolved', function(assert) {
  const manifestObject = parseManifest({
    url: 'http://test.com',
    manifestString: hlsMasterPlaylist({
      numPlaylists: 2
    }),
    mimeType: 'application/x-mpegURL'
  });

  assert.equal(manifestObject.playlists.length, 2, 'two playlists');
  assert.notOk(manifestObject.playlists[0].segments, 'did not resolve segment list');
  assert.notOk(manifestObject.playlists[1].segments, 'did not resolve segment list');
});

QUnit.test('HLS media manifest segment list is resolved', function(assert) {
  const manifestObject = parseManifest({
    url: 'http://test.com',
    manifestString: hlsMediaPlaylist({}),
    mimeType: 'application/x-mpegURL'
  });

  assert.notOk(manifestObject.playlists, 'no playlists');
  assert.equal(
    manifestObject.segments.length,
    1,
    'resolved segment list'
  );
});

QUnit.test('DASH manifest segment lists are resolved', function(assert) {
  const manifestObject = parseManifest({
    url: 'http://test.com',
    manifestString: dashPlaylist({}),
    mimeType: 'application/dash+xml'
  });

  assert.equal(manifestObject.playlists.length, 2, 'two playlists');
  assert.equal(
    manifestObject.playlists[0].segments.length,
    1,
    'resolved segment list'
  );
  assert.equal(
    manifestObject.playlists[1].segments.length,
    1,
    'resolved segment list'
  );
});

QUnit.test('HLS media manifest has attributes property added', function(assert) {
  const manifestObject = parseManifest({
    url: 'http://test.com',
    manifestString: hlsMediaPlaylist({}),
    mimeType: 'application/x-mpegURL'
  });

  assert.notOk(manifestObject.playlists, 'no playlists');
  assert.ok(manifestObject.attributes, 'has attributes property');
});

QUnit.test('HLS media manifest segments have resolvedUri properties', function(assert) {
  const manifestObject = parseManifest({
    url: 'http://test.com',
    manifestString: hlsMediaPlaylist({}),
    mimeType: 'application/x-mpegURL'
  });

  assert.notOk(manifestObject.playlists, 'no playlists');
  assert.equal(
    manifestObject.segments.length,
    1,
    'resolved segment list'
  );
  assert.equal(
    manifestObject.segments[0].resolvedUri,
    'http://test.com/0.ts',
    'added resolvedUri property to segment'
  );
});

QUnit.test('HLS key and map URIs are resolved', function(assert) {
  const manifestObject = parseManifest({
    url: 'http://test.com',
    manifestString: hlsMediaPlaylist({
      keyUri: 'key.php',
      mapUri: 'init.mp4'
    }),
    mimeType: 'application/x-mpegURL'
  });

  assert.equal(manifestObject.segments.length, 1, 'one segment');
  assert.equal(
    manifestObject.segments[0].key.resolvedUri,
    'http://test.com/key.php',
    'resolved key uri'
  );
  assert.equal(
    manifestObject.segments[0].map.resolvedUri,
    'http://test.com/init.mp4',
    'resolved map uri'
  );
});
