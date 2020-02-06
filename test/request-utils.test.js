import QUnit from 'qunit';
import sinon from 'sinon';
import videojs from 'video.js';

import { requestAll } from '../src/request-utils';

QUnit.module('request-utils');

QUnit.module('requestAll', {
  beforeEach(assert) {
    this.origXMLHttpRequest = videojs.xhr.XMLHttpRequest;
    this.xhr = sinon.useFakeXMLHttpRequest();
    videojs.xhr.XMLHttpRequest = this.xhr;
    this.requests = [];

    this.xhr.onCreate = (xhr) => this.requests.push(xhr);
  },

  afterEach() {
    this.xhr.restore();
    videojs.xhr.XMLHttpRequest = this.origXMLHttpRequest;
  }
});

QUnit.test('waits for all requests to finish before calling back', function(assert) {
  assert.expect(5);
  const url1 = 'url1';
  const url2 = 'url2';
  const url3 = 'url3';
  const response1 = 'response1';
  const response2 = 'response2';
  const response3 = 'response3';

  requestAll([url1, url2, url3], (err, responses) => {
    assert.notOk(err);
    assert.equal(responses[url1], response1, 'correct response');
    assert.equal(responses[url2], response2, 'correct response');
    assert.equal(responses[url3], response3, 'correct response');
  });

  assert.equal(this.requests.length, 3, 'three requests');
  this.requests.shift().respond(200, null, response1);
  this.requests.shift().respond(200, null, response2);
  this.requests.shift().respond(200, null, response3);
});

QUnit.test('calls back immediately on error', function(assert) {
  assert.expect(3);

  let request;

  requestAll(['url1', 'url2'], (err, responses) => {
    assert.deepEqual(
      err,
      { message: 'Request failed', request },
      'calls back with error'
    );
    assert.notOk(responses, 'no responses object provided');
  });

  assert.equal(this.requests.length, 2, 'two requests');
  request = this.requests.shift();
  request.respond(500, null, 'error');
});

QUnit.test('aborts other requests after an error', function(assert) {
  assert.expect(6);

  let callbackCount = 0;
  let request;

  requestAll(['url1', 'url2'], (err, responses) => {
    callbackCount++;
    assert.deepEqual(
      err,
      { message: 'Request failed', request },
      'calls back with error'
    );
    assert.notOk(responses, 'no responses object provided');
  });

  assert.equal(this.requests.length, 2, 'two requests');
  request = this.requests.shift();
  request.respond(500, null, 'error');
  assert.ok(this.requests.shift().aborted, 'aborted other requests');
  assert.notOk(request.aborted, 'original request not aborted');
  assert.equal(callbackCount, 1, 'only one callback');
});

QUnit.test('does not call same URL twice', function(assert) {
  assert.expect(3);

  requestAll(['url1', 'url1'], (err, responses) => {
    assert.notOk(err);
    assert.equal(responses.url1, 'url1-response', 'correct response');
  });

  assert.equal(this.requests.length, 1, 'one request');
  this.requests.shift().respond(200, null, 'url1-response');
});
