export const hlsMasterPlaylist = ({
  numPlaylists = 1,
  playlistPrefix = 'playlist',
  includeDemuxedAudio = false,
  codecs = ''
}) => {
  const playlists = [];

  for (let i = 0; i < numPlaylists; i++) {
    const playlistPath = `${playlistPrefix}${i}.m3u8`;
    const audioAttribute = includeDemuxedAudio ? ',AUDIO="audio"' : '';
    const codecsAttribute = codecs ? ',CODECS="${codecs}"' : '';

    playlists.push(`
      #EXT-X-STREAM-INF:BANDWIDTH=${100 + i}${audioAttribute}${codecsAttribute}
      ${playlistPath}
    `);
  }

  const audioGroup = includeDemuxedAudio ?
    '#EXT-X-MEDIA:TYPE=AUDIO' +
      ',GROUP-ID="audio",LANGUAGE="en",NAME="English"' +
      ',AUTOSELECT=YES,DEFAULT=YES' +
      `,URI="${playlistPrefix}-audio.m3u8"` :
    '';

  return `
    #EXTM3U
    #EXT-X-VERSION:3
    ${audioGroup}

    ${playlists.join('\n')}
  `;
};

export const hlsMediaPlaylist = ({
  numSegments = 1,
  segmentPrefix = '',
  segmentDuration = 10,
  targetDuration = 10,
  keyUri = '',
  mapUri = ''
}) => {
  const segments = [];

  for (let i = 0; i < numSegments; i++) {
    const segmentPath = `${segmentPrefix}${i}.ts`;
    let segmentLines = '';

    if (keyUri) {
      segmentLines += `
        #EXT-X-KEY:METHOD=AES-128,URI="${keyUri}"
      `;
    }
    if (mapUri) {
      segmentLines += `
        #EXT-X-MAP:URI="${mapUri}"
      `;
    }

    segmentLines += `
      #EXTINF:${segmentDuration}
      ${segmentPath}
    `;

    segments.push(segmentLines);
  }

  return `
    #EXTM3U
    #EXT-X-VERSION:3
    #EXT-X-PLAYLIST-TYPE:VOD
    #EXT-X-MEDIA-SEQUENCE:0
    #EXT-X-TARGETDURATION:${targetDuration}
    ${segments.join('\n')}
    #EXT-X-ENDLIST
  `;
};

export const dashPlaylist = ({
  numSegments = 1,
  segmentDuration = 10
}) => {
  return `<?xml version="1.0"?>
    <MPD
      xmlns="urn:mpeg:dash:schema:mpd:2011"
      profiles="urn:mpeg:dash:profile:full:2011"
      minBufferTime="1.5"
      mediaPresentationDuration="PT${numSegments * segmentDuration}S">
      <Period>
        <BaseURL>main/</BaseURL>
        <AdaptationSet mimeType="video/mp4">
          <BaseURL>video/</BaseURL>
          <Representation
            id="1080p"
            bandwidth="6800000"
            width="1920"
            height="1080"
            codecs="avc1.420015">
            <BaseURL>1080/</BaseURL>
            <SegmentTemplate
              media="$RepresentationID$-segment-$Number$.mp4"
              initialization="$RepresentationID$-init.mp4"
              duration="${segmentDuration}"
              timescale="1"
              startNumber="0" />
          </Representation>
          <Representation
            id="720p"
            bandwidth="2400000"
            width="1280"
            height="720"
            codecs="avc1.420015">
            <BaseURL>720/</BaseURL>
            <SegmentTemplate
              media="$RepresentationID$-segment-$Number$.mp4"
              initialization="$RepresentationID$-init.mp4"
              duration="${segmentDuration}"
              timescale="1"
              startNumber="0" />
          </Representation>
        </AdaptationSet>
        <AdaptationSet mimeType="audio/mp4">
          <BaseURL>audio/</BaseURL>
          <Representation id="audio" bandwidth="128000" codecs="mp4a.40.2">
            <BaseURL>720/</BaseURL>
            <SegmentTemplate
              media="segment-$Number$.mp4"
              initialization="$RepresentationID$-init.mp4"
              duration="${segmentDuration}"
              timescale="1"
              startNumber="0" />
          </Representation>
        </AdaptationSet>
      </Period>
    </MPD>`;
};
