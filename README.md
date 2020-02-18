# videojs-concat

Concatenate videos for playback in a Video.js player

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Requirements](#requirements)
  - [Test Page](#test-page)
- [Installation](#installation)
- [Usage](#usage)
  - [`<script>` Tag](#script-tag)
  - [Browserify/CommonJS](#browserifycommonjs)
  - [RequireJS/AMD](#requirejsamd)
- [Method](#method)
- [Limitations](#limitations)
- [DRM](#drm)
- [Examples](#examples)
  - [Two of the same DASH source](#two-of-the-same-dash-source)
  - [Two of the same HLS source](#two-of-the-same-hls-source)
  - [Two of the same demuxed HLS source](#two-of-the-same-demuxed-hls-source)
  - [Demuxed HLS and DASH](#demuxed-hls-and-dash)
  - [HLS Widevine and DASH Widevine](#hls-widevine-and-dash-widevine)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Requirements

Note that this plugin requires the master branch of [VHS].

### Test Page

To use the test page, clone [VHS], run:

```sh
npm install
npm run build
npm link
```

Then in the plugin-concat directory, run:

```sh
npm link @videojs/http-streaming
```

## Installation

```sh
npm install --save @videojs/plugin-concat
```

## Usage

To include videojs-concat on your website or web application, use any of the following methods.

### `<script>` Tag

This is the simplest case. Get the script in whatever way you prefer and include the plugin _after_ you include [video.js][videojs], so that the `videojs` global is available.

```html
<script src="//path/to/video.min.js"></script>
<script src="//path/to/plugin-concat.min.js"></script>
<script>
  var player = videojs('my-video');

  player.concat(options);
</script>
```

### Browserify/CommonJS

When using with Browserify, install videojs-concat via npm and `require` the plugin as you would any other module.

```js
var videojs = require('video.js');

// The actual plugin function is exported by this module, but it is also
// attached to the `Player.prototype`; so, there is no need to assign it
// to a variable.
require('@videojs/plugin-concat');

var player = videojs('my-video');

player.concat();
```

### RequireJS/AMD

When using with RequireJS (or another AMD library), get the script in whatever way you prefer and `require` the plugin as you normally would:

```js
require(['video.js', '@videojs/plugin-concat'], function(videojs) {
  var player = videojs('my-video');

  player.concat(options);
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

## DRM

DRM is supported via [videojs-contrib-eme].

To use DRM encrypted sources, add `keySystems` information to each encrypted manifest object in the same way as would be done for [videojs-contrib-eme]. See [the README](https://github.com/videojs/videojs-contrib-eme#setting-options-per-source) for details.

Normally, licenses are requested for a video when segments are appended to the browser and the browser needs to decrypt the video. However, with multiple videos being concatenated, determining which key system information to use for the license request becomes challenging. Therefore, videojs-concat returns a function, `initializeKeySystems(player)` which sets up all of the key systems at once. `initializeKeySystems(player)` should be called after setting the source on the player. See [HLS Widevine and DASH Widevine] for an example.

## Examples

### Two of the same DASH source

```js
player.concat({
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
      src: `data:application/vnd.videojs.vhs+json,${JSON.stringify(result.manifestObject)}`,
      type: 'application/vnd.videojs.vhs+json'
    });
  }
});
```

### Two of the same HLS source

```js
player.concat({
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
      src: `data:application/vnd.videojs.vhs+json,${JSON.stringify(result.manifestObject)}`,
      type: 'application/vnd.videojs.vhs+json'
    });
  }
});
```

### Two of the same demuxed HLS source

```js
player.concat({
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
      src: `data:application/vnd.videojs.vhs+json,${JSON.stringify(result.manifestObject)}`,
      type: 'application/vnd.videojs.vhs+json'
    });
  }
});
```

### Demuxed HLS and DASH

```js
player.concat({
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
      src: `data:application/vnd.videojs.vhs+json,${JSON.stringify(result.manifestObject)}`,
      type: 'application/vnd.videojs.vhs+json'
    });
  }
});
```

### HLS Widevine and DASH Widevine

```js
// initialize videojs-conrib-eme if it hasn't been initialized already
player.eme();
player.concat({
  manifests: [{
    url: 'https://amssamples.streaming.mediaservices.windows.net/622b189f-ec39-43f2-93a2-201ac4e31ce1/BigBuckBunny.ism/manifest(format=mpd-time-csf)',
    mimeType: 'application/dash+xml',
    keySystems: {
      'com.widevine.alpha': 'https://amssamples.keydelivery.mediaservices.windows.net/Widevine/?KID=1ab45440-532c-4399-94dc-5c5ad9584bac'
    }
  }, {
    url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine-hls/hls.m3u8',
    mimeType: 'application/x-mpegURL',
    keySystems: {
      'com.widevine.alpha': 'https://cwip-shaka-proxy.appspot.com/no_auth'
    }
  }],
  targetVerticalResolution: 720,
  callback: (err, result) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(result);
    player.src({
      src: `data:application/vnd.videojs.vhs+json,${JSON.stringify(result.manifestObject)}`,
      type: 'application/vnd.videojs.vhs+json'
    });
    result.initializeKeySystems(player);
  }
});
```

## License

Apache-2.0. Copyright (c) Brightcove, Inc


[videojs]: http://videojs.com/
[videojs-contrib-eme]: https://github.com/videojs/videojs-contrib-eme
[VHS]: https://github.com/videojs/http-streaming
