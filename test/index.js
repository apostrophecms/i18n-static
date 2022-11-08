const assert = require('assert').strict;
const t = require('apostrophe/test-lib/util.js');

describe('I18n-static', function() {
  this.timeout(5000);
  let apos;

  after(function () {
    return t.destroy(apos);
  });

  before(async function () {
    apos = await t.create({
      root: module,
      baseUrl: 'http://localhost:3000',
      testModule: true,
      modules: {
        '@apostrophecms/express': {
          options: {
            session: { secret: 'supersecret' }
          }
        },
        '@apostrophecms/i18n-static': {}
      }
    });
  });

  it('should get namespaces', function () {
    const actual = apos.modules['@apostrophecms/i18n-static'].getNamespaces();
    const expected = [
      {
        label: 'default',
        value: 'default'
      },
      {
        label: 'apostrophe',
        value: 'apostrophe'
      },
      {
        label: 'i18nStatic',
        value: 'i18nStatic'
      }
    ];

    assert.deepEqual(actual, expected);
  });

  it('should exclude namespaces', function () {
    apos.modules['@apostrophecms/i18n-static'].options.excludeNamespaces = [ 'apostrophe' ];
    const actual = apos.modules['@apostrophecms/i18n-static'].getNamespaces();
    const expected = [
      {
        label: 'default',
        value: 'default'
      },
      {
        label: 'i18nStatic',
        value: 'i18nStatic'
      }
    ];

    assert.deepEqual(actual, expected);
  });

  it('should format pieces', function () {
    const pieces = [
      {
        title: 'test',
        namespace: 'default',
        valueSingular: 'test singular',
        valuePlural: 'test plural',
        valueZero: 'test zero'
      },
      {
        title: 'test 1',
        namespace: 'default',
        valueSingular: 'test singular',
        valuePlural: 'test plural',
        valuePluralFew: 'test few'
      }
    ];
    const actual = apos.modules['@apostrophecms/i18n-static'].formatPieces(pieces);
    const expected = {
      test: 'test singular',
      test_plural: 'test plural',
      test_zero: 'test zero',
      test_two: undefined,
      test_few: undefined,
      test_many: undefined,
      'test 1': 'test singular',
      'test 1_plural': 'test plural',
      'test 1_zero': undefined,
      'test 1_two': undefined,
      'test 1_few': 'test few',
      'test 1_many': undefined
    };

    assert.deepEqual(actual, expected);
  });

});
