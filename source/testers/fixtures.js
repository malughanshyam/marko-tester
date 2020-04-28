'use strict';

var Normalizer = require('html-normalizer');
var fs = require('fs-extra');
var _ = require('lodash');
var chai = require('chai');
var Promise = require('bluebird');
var utils = require('../utils');
var expect = chai.expect;
var excludedAttributes = [];
var diff = require('diffable-html');

function excludeAttribute(attr) {
  excludedAttributes.push(attr);
}

function normalizer() {
  var COMPARE_ALL_ATTRIBUTES_STYLES_AND_CLASSES = {
    attributes: null,
    attributesExcluded: excludedAttributes,
    styles: null,
    classNames: null
  };

  return new Normalizer(COMPARE_ALL_ATTRIBUTES_STYLES_AND_CLASSES);
}

function cleanRenderedHtml(html) {
  var trimmedHtml = (html || '').trim();

  return trimmedHtml && diff(normalizer().domString(trimmedHtml));
}

function renderHtml(renderer, fixture) {
  return new Promise(function promiseRenderedHtml(resolve, reject) {
    var callback = function parseComponentRenderedHtml(error, result) {
      if (error) {
        return reject('TestFixtures: Failed to render component html.');
      }

      var html = _.isObject(result) ? result.html : result;

      return resolve(cleanRenderedHtml(html));
    };

    callback.global = {};
    renderer(fixture, callback);
  });
}

function createTest(context, testCase) {
  it('should render component using ' + testCase.name + ' input', function compareRenderedHtml(done) {
    this.timeout(utils.getHelpers().config.componentTimeout);

    var expectedHtml = cleanRenderedHtml(testCase.expectedHtml);

    renderHtml(context.renderer, testCase.fixture)
      .catch(function onFailedComponentRender(error) {
        throw new Error(error);
      })
      .then(function (actualHtml) {
        if (utils.getHelpers().withFixFixtures && actualHtml !== expectedHtml) {
          fs.writeFileSync(testCase.absPath, actualHtml + '\n', 'utf-8');
          expectedHtml = actualHtml;
        }

        expect(actualHtml).to.be.equal(expectedHtml);
        done();
      })
      .catch(done);
  });
}

function testFixtures(context, opts) {
  var options = opts || {};

  if (!context.renderer) {
    Object.assign(context, {
      renderer: utils.getRenderer()
    });
  }

  if (!context.renderer) {
    throw new Error('TestFixtures: Cannot automatically locate renderer, please specify one.');
  }

  var testCases = [];
  var fixtures = utils.getFixtures(context);

  fixtures.forEach(function createTestCases(fixture) {
    testCases.push({
      name: fixture.testName,
      fixture: fixture.data,
      expectedHtml: fixture.expectedHtml,
      absPath: fixture.absPath
    });
  });

  if (context.options.fixturesPath && !testCases.length) {
    throw new Error('TestFixtures: No fixtures found in specified location');
  }

  options.mochaOperation('Given specific input data', function givenSpecificInputData() {
    testCases.forEach(createTest.bind(null, context));
  });
}

module.exports = utils.runWithMochaOperation.bind(null, null, testFixtures);
module.exports.only = utils.runWithMochaOperation.bind(null, 'only', testFixtures);
module.exports.skip = utils.runWithMochaOperation.bind(null, 'skip', testFixtures);

module.exports.excludeAttribute = excludeAttribute;
