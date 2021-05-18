import QUnit from 'qunit';
import {
  chooseVideoPlaylists,
  chooseAudioPlaylists,
  DEFAULT_BANDWIDTH
} from '../src/choose-playlists';

QUnit.module('chooseVideoPlaylists');

QUnit.test('chooses video playlists by target vertical resolution', function(assert) {
  const playlist1 = { attributes: { RESOLUTION: {width: 2, height: 1} } };
  const playlist2 = { attributes: { RESOLUTION: {width: 1000, height: 719}}};
  const playlist3 = { attributes: { RESOLUTION: {width: 1000, height: 722 }} };

  assert.deepEqual(
    chooseVideoPlaylists(
      [
        [playlist1, playlist2, playlist3],
        [playlist1, playlist2, playlist3],
        [playlist1, playlist2, playlist3]
      ],
      720
    ),
    [playlist2, playlist2, playlist2],
    'chose closest video playlists'
  );
});

QUnit.test('when no resolution, chooses video playlists by bandwidth', function(assert) {
  const playlist1 = { attributes: { BANDWIDTH: DEFAULT_BANDWIDTH - 3 } };
  const playlist2 = { attributes: { BANDWIDTH: DEFAULT_BANDWIDTH - 2 } };
  const playlist3 = { attributes: { BANDWIDTH: DEFAULT_BANDWIDTH + 1 } };

  assert.deepEqual(
    chooseVideoPlaylists(
      [
        [playlist1, playlist2, playlist3],
        [playlist1, playlist2, playlist3],
        [playlist1, playlist2, playlist3]
      ],
      720
    ),
    [playlist3, playlist3, playlist3],
    'chose closest video playlists'
  );
});

QUnit.test(
  'when only partial resolution info, selects video playlist with info',
  function(assert) {
    const playlist1 = { attributes: { BANDWIDTH: DEFAULT_BANDWIDTH - 3 } };
    const playlist2 = {
      attributes: {
        RESOLUTION: 1,
        BANDWIDTH: DEFAULT_BANDWIDTH - 2
      }
    };
    const playlist3 = { attributes: { BANDWIDTH: DEFAULT_BANDWIDTH + 1 } };

    assert.deepEqual(
      chooseVideoPlaylists(
        [
          [playlist3, playlist2, playlist1],
          [playlist2, playlist3, playlist1],
          [playlist1, playlist3, playlist2]
        ],
        720
      ),
      [playlist2, playlist2, playlist2],
      'chose video playlists with resolution info'
    );
  }
);

QUnit.module('chooseAudioPlaylists');

QUnit.test('throws error if mismatching number of playlists', function(assert) {
  const manifestObject1 = {
    mediaGroups: {
      AUDIO: {
        audio1: {
          en: { default: true, resolvedUri: 'resolved-uri-1' },
          es: { default: false, resolvedUri: 'resolved-uri' }
        }
      }
    }
  };
  const videoPlaylist1 = { attributes: { AUDIO: 'audio1' } };
  const videoPlaylist2 = { attributes: { AUDIO: 'audio1' } };

  assert.throws(
    () => chooseAudioPlaylists([manifestObject1], [videoPlaylist1, videoPlaylist2]),
    /Invalid number of video playlists for provided manifests/,
    'threw error for mismatched number of playlists'
  );
});

QUnit.test('chooses default audio playlists for video playlists', function(assert) {
  const audioPlaylist2Resolved = { test: 'case' };
  const audioPlaylist1 = { default: true, resolvedUri: 'resolved-uri-1' };
  const audioPlaylist2 = { default: true, playlists: [audioPlaylist2Resolved] };
  const audioPlaylist3 = { default: true, resolvedUri: 'resolved-uri-3' };
  const manifestObject1 = {
    mediaGroups: {
      AUDIO: {
        audio1: {
          en: audioPlaylist1,
          es: { default: false, resolvedUri: 'resolved-uri' }
        }
      }
    }
  };
  const manifestObject2 = {
    mediaGroups: {
      AUDIO: {
        audio1: {
          en: { default: false, playlists: [] },
          es: audioPlaylist2
        }
      }
    }
  };
  const manifestObject3 = {
    mediaGroups: {
      AUDIO: {
        audio1: {
          en: { default: false, resolvedUri: 'resolved-uri' },
          es: audioPlaylist3
        }
      }
    }
  };
  const videoPlaylist1 = { attributes: { AUDIO: 'audio1' } };
  const videoPlaylist2 = { attributes: { AUDIO: 'audio1' } };
  const videoPlaylist3 = { attributes: { AUDIO: 'audio1' } };

  assert.deepEqual(
    chooseAudioPlaylists(
      [manifestObject1, manifestObject2, manifestObject3],
      [videoPlaylist1, videoPlaylist2, videoPlaylist3]
    ),
    [audioPlaylist1, audioPlaylist2Resolved, audioPlaylist3],
    'chose default audio playlists'
  );
});

QUnit.test('throws error when missing audio playlist', function(assert) {
  const audioPlaylist1 = { default: true, resolvedUri: 'resolved-uri-1' };
  // missing both resolvedUri and playlists, but only for this audio playlist
  const audioPlaylist2 = { default: true };
  const audioPlaylist3 = { default: true, resolvedUri: 'resolved-uri-3' };
  const manifestObject1 = {
    mediaGroups: {
      AUDIO: {
        audio1: {
          en: audioPlaylist1,
          es: { default: false, resolvedUri: 'resolved-uri' }
        }
      }
    }
  };
  const manifestObject2 = {
    mediaGroups: {
      AUDIO: {
        audio1: {
          en: { default: false, playlists: [] },
          es: audioPlaylist2
        }
      }
    }
  };
  const manifestObject3 = {
    mediaGroups: {
      AUDIO: {
        audio1: {
          en: { default: false, resolvedUri: 'resolved-uri' },
          es: audioPlaylist3
        }
      }
    }
  };
  const videoPlaylist1 = { attributes: { AUDIO: 'audio1' } };
  const videoPlaylist2 = { attributes: { AUDIO: 'audio1' } };
  const videoPlaylist3 = { attributes: { AUDIO: 'audio1' } };

  assert.throws(
    () => {
      chooseAudioPlaylists(
        [manifestObject1, manifestObject2, manifestObject3],
        [videoPlaylist1, videoPlaylist2, videoPlaylist3]
      );
    },
    new Error('Did not find matching audio playlists for all video playlists'),
    'throws error when missing resolvedUri and playlist in matching audio playlist'
  );
});

QUnit.test('throws error when missing default audio playlist', function(assert) {
  const audioPlaylist2Resolved = { test: 'case' };
  const audioPlaylist1 = { default: true, resolvedUri: 'resolved-uri-1' };
  // not default
  const audioPlaylist2 = { default: false, playlists: [audioPlaylist2Resolved] };
  const audioPlaylist3 = { default: true, resolvedUri: 'resolved-uri-3' };
  const manifestObject1 = {
    mediaGroups: {
      AUDIO: {
        audio1: {
          en: audioPlaylist1,
          es: { default: false, resolvedUri: 'resolved-uri' }
        }
      }
    }
  };
  const manifestObject2 = {
    mediaGroups: {
      AUDIO: {
        audio1: {
          en: { default: false, playlists: [] },
          es: audioPlaylist2
        }
      }
    }
  };
  const manifestObject3 = {
    mediaGroups: {
      AUDIO: {
        audio1: {
          en: { default: false, resolvedUri: 'resolved-uri' },
          es: audioPlaylist3
        }
      }
    }
  };
  const videoPlaylist1 = { attributes: { AUDIO: 'audio1' } };
  const videoPlaylist2 = { attributes: { AUDIO: 'audio1' } };
  const videoPlaylist3 = { attributes: { AUDIO: 'audio1' } };

  assert.throws(
    () => {
      chooseAudioPlaylists(
        [manifestObject1, manifestObject2, manifestObject3],
        [videoPlaylist1, videoPlaylist2, videoPlaylist3]
      );
    },
    new Error('Did not find matching audio playlists for all video playlists'),
    'throws error when missing a default audio playlist'
  );
});
