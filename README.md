# videojs-concat

Concatenate videos for playback in a Video.js player

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Installation](#installation)
- [Usage](#usage)
  - [`<script>` Tag](#script-tag)
  - [Browserify/CommonJS](#browserifycommonjs)
  - [RequireJS/AMD](#requirejsamd)
- [Method](#method)
- [Limitations](#limitations)
- [Examples](#examples)
  - [Two of the same DASH source](#two-of-the-same-dash-source)
  - [Two of the same HLS source](#two-of-the-same-hls-source)
  - [Two of the same demuxed HLS source](#two-of-the-same-demuxed-hls-source)
  - [Demuxed HLS and DASH](#demuxed-hls-and-dash)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->
## Installation

```sh
npm install --save videojs-concat
```

## Usage

To include videojs-concat on your website or web application, use any of the following methods.

### `<script>` Tag

This is the simplest case. Get the script in whatever way you prefer and include the plugin _after_ you include [video.js][videojs], so that the `videojs` global is available.

```html
<script src="//path/to/video.min.js"></script>
<script src="//path/to/videojs-concat.min.js"></script>
<script>
  var player = videojs('my-video');

  player.concat();
</script>
```

### Browserify/CommonJS

When using with Browserify, install videojs-concat via npm and `require` the plugin as you would any other module.

```js
var videojs = require('video.js');

// The actual plugin function is exported by this module, but it is also
// attached to the `Player.prototype`; so, there is no need to assign it
// to a variable.
require('videojs-concat');

var player = videojs('my-video');

player.concat();
```

### RequireJS/AMD

When using with RequireJS (or another AMD library), get the script in whatever way you prefer and `require` the plugin as you normally would:

```js
require(['video.js', 'videojs-concat'], function(videojs) {
  var player = videojs('my-video');

  player.concat();
});
```

## Method

videojs-concat uses the standard VHS manifest parsers (m3u8-parser and mpd-parser at the moment) to create manifest objects from the downloaded manifests, then merges the JSON objects. The result can be passed as JSON via a data URI to VHS.

To use videojs-concat, all that needs to be done is to call the function `videojs.concat.concatenateVideos` and wait for the asynchronous operation to finish. The operation is asynchronous to allow for downloading of the manifests.

## Limitations

* Renditions must have both audio and video (though demuxed is supported in addition to muxed).
* Only HLS and DASH are supported (at the moment).
* Only one rendition is used per source.
* Alternate audio is not supported (except demuxed with default audio playlists).
* WebVTT subtitle playlists are not supported.

## Examples

### Two of the same DASH source

```js
player.concat.concatenateVideos({
  manifests: [{
    url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
    mimeType: 'application/dash+xml'
  }, {
    url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
    mimeType: 'application/dash+xml'
  }],
  targetVerticalResolution: 720,
  callback: (err, result) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(result);
    player.src({
      src: `data:application/vnd.vhs+json,${JSON.stringify(result.manifestObject)}`,
      type: 'application/vnd.vhs+json'
    });
  }
});
```

### Two of the same HLS source

```js
player.concat.concatenateVideos({
  manifests: [{
    url: 'https://s3.amazonaws.com/_bc_dml/example-content/bipbop-advanced/bipbop_16x9_variant.m3u8',
    mimeType: 'application/x-mpegURL'
  }, {
    url: 'https://s3.amazonaws.com/_bc_dml/example-content/bipbop-advanced/bipbop_16x9_variant.m3u8',
    mimeType: 'application/x-mpegURL'
  }],
  targetVerticalResolution: 720,
  callback: (err, result) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(result);
    player.src({
      src: `data:application/vnd.vhs+json,${JSON.stringify(result.manifestObject)}`,
      type: 'application/vnd.vhs+json'
    });
  }
});
```

### Two of the same demuxed HLS source

```js
player.concat.concatenateVideos({
  manifests: [{
    url: 'http://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8',
    mimeType: 'application/x-mpegURL'
  }, {
    url: 'http://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8',
    mimeType: 'application/x-mpegURL'
  }],
  targetVerticalResolution: 720,
  callback: (err, result) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(result);
    player.src({
      src: `data:application/vnd.vhs+json,${JSON.stringify(result.manifestObject)}`,
      type: 'application/vnd.vhs+json'
    });
  }
});
```

### Demuxed HLS and DASH

```js
player.concat.concatenateVideos({
  manifests: [{
    url: 'http://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8',
    mimeType: 'application/x-mpegURL'
  }, {
    url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
    mimeType: 'application/dash+xml'
  }],
  targetVerticalResolution: 720,
  callback: (err, result) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(result);
    player.src({
      src: `data:application/vnd.vhs+json,${JSON.stringify(result.manifestObject)}`,
      type: 'application/vnd.vhs+json'
    });
  }
});
```

## License

Apache-2.0. Copyright (c) Brightcove, Inc


[videojs]: http://videojs.com/
