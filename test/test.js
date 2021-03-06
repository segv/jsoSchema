/*global require, suite, test */
'use strict';

var assert = require('chai').assert;

var s = require('../src/jsoSchema');

var l = function (prefix, value) {
  console.log(prefix, require('util').inspect(value, true, 1000));
};

var _test = function (schema, value) {
  var test = schema.test(value);
  test.logTrace = function () {
    console.log(s.formatTrace(test.trace));
  };
  return test;
};

var _msg = function (schema, value, message) {
  return message || (JSON.stringify(schema) + ' on ' + JSON.stringify(value));
};

var match = { };

match.fail = function (schema, value, message) {
  var test = _test(schema, value);
  assert.notOk(test.match, _msg(schema, value, message));
  return test;
};

match.pass = function (schema, value, message) {
  var test = _test(schema, value);
  assert.ok(test.match, _msg(schema, value, message));
  return test;
};

suite('simple schemas');

test('simple condition schemas work', function () {

  match.pass(s.Condition(function () { return true;  }), undefined);
  match.fail(s.Condition(function () { return false; }), undefined);
  match.pass(s.Condition(function (x) { return x == 0; }), 0);
  match.pass(s.Condition(function (x) { return x == 1; }), 1);
  match.fail(s.Condition(function (x) { return x < 0; }), 1);
  match.pass(s.Condition(function (x) { return x < 0; }), -1);
});

suite('meta info');

test('can set doc', function () {
  var l = 'a trivial schema';
  var d = 'a trivial docstring';

  var schema = s.Condition(function (value) { return false; });

  schema.label(l).doc(d);

  assert(schema.label() == l, 'label santiy check failed');
  assert(schema.doc() == d, 'doc sanity check failed');
});

test('schema in trace results', function () {
  var schema = s.Condition(function (value) { return true; });
  var match = schema.test(undefined);
  assert(match.trace, 'missing trace result');
  assert(match.trace[0].schema == schema, 'schema not in trace result');
});

// leave this here to debug problems with the trace formatting, don't
// actually want to test it.
if (0) {
  test('schema in complex trace results', function () {
    var schema = s.And(s.Or(s.Condition(function (value) { return false; }).label('i am always false1'),
                            s.Condition(function (value) { return false; }).label('i am always false2'),
                            s.Condition(function (value) { return true; }).label('i am always true')).label('first or'),
                       s.Or(s.GreaterThan(0)).label('second or'),
                       s.Or(s.And(s.Condition(function (value) { return true; }).label('i am always true'),
                                  s.Condition(function (value) { return false; }).label('i am always false')),
                            s.Condition(function (value) { return true; }).label('i am always true')).label('third or'));
    var match = schema.test(7);

    console.log(match.backtrace());

    assert(match.trace, 'missing trace result');
    assert(match.trace[0].schema == schema, 'schema not in trace result');
  });
}

suite('schemas');

var plus  = s.Condition(function (x) { return x > 0;  }).label('a positive integer');
var minus = s.Condition(function (x) { return x < 0;  }).label('a negatvie integer');
var zero = s.Constant(0);
var four = s.Constant(4);
var three = s.Constant(3);

test('any schemas work', function () {
  var schema = s.Any([plus, minus]).label('plus or minus');

  match.pass(schema, 1);
  match.pass(schema, -1);

  match.pass(schema, -1);
  match.fail(schema, 0);

  match.fail(s.Any([]), undefined);
});

test('every schemas work', function () {
  var schema = s.Every([ plus, four ]);

  match.pass(schema, 4);
  match.fail(schema, 1);
  match.fail(schema, 0);
  match.fail(schema, -1);

  match.pass(s.Every([]), undefined);
});

test('backtracking1', function () {
  var schema = s.Any([ s.Every([plus, four]),
                       s.Every([minus, four]),
                       s.Every([zero]) ]);

  match.pass(schema,  4);
  match.pass(schema,  0);
  match.fail(schema,  3);
  match.fail(schema, -1);
});

test('backtracking2', function () {
  var schema = s.And(s.Or(minus, three),
                     s.Or(three));

  match.fail(schema,  4);
  match.pass(schema,  3);
  match.fail(schema, -1);
});

test('OfType', function () {
  var schema = s.And(s.Or(minus, three),
                     s.Or(three));

  match.fail(schema, 4);
  match.pass(schema, 3);
  //console.log(s.formatTrace(schema.test(3).trace));
  match.fail(schema, -1);
});

test('Nullable', function () {
  var schema = s.Nullable(s.Integer());

  match.pass(schema, 0);
  match.pass(schema, 1);
  match.pass(schema, null);
  match.fail(schema, 'foo');
});

test('array', function () {
  match.pass(s.Array(s.DontCare()), [ ]);
  match.pass(s.Array(s.DontCare()), [ 1 ]);
  match.fail(s.Array(s.DontCare()), '');
  match.fail(s.Array(s.DontCare()), null );

  match.pass(s.Array(s.Integer()), [ ]);
  match.pass(s.Array(s.Integer()), [ 1 ]);
  match.pass(s.Array(s.Integer()), [ 1, 2 ]);
  match.fail(s.Array(s.Integer()), '');
  match.fail(s.Array(s.Integer()), [ '1' ]);
  match.fail(s.Array(s.Integer()), [ 1, '2' ]);

  match.pass(s.Array(s.Integer(), s.Constant(0)), [ ]);
  match.fail(s.Array(s.Integer(), s.Constant(1)), [ ]);
  match.pass(s.Array(s.Integer(), s.Constant(1)), [ 1 ]);
  match.fail(s.Array(s.Integer(), s.GreaterThan(1)), [ 1 ]);
  match.pass(s.Array(s.Integer(), s.GreaterThan(1)), [ 1, 2 ]);
});

test('object', function () {
  match.pass(s.Object(), { });

  match.pass(s.Object({ required_properties: { _id: s.String() } }),  { _id: '123' });
  match.fail(s.Object({ required_properties: { _id: s.Integer() } }), { _id: '123' });

  match.fail(s.Record({ a: s.Pass() }), { });
  match.pass(s.Record({ a: s.Pass() }), { a: false });
  match.fail(s.Record({ a: s.Pass() }), { });

  match.pass(s.Object({ required_properties: { _id: s.Or(s.String(), s.Integer()) } }),  { _id: '123' });
  match.pass(s.Object({ required_properties: { _id: s.Or(s.String(), s.Integer()) } }),  { _id: 123 });
  match.fail(s.Object({ required_properties: { _id: s.Or(s.String(), s.Integer()) } }),  { _id: false });

  match.pass(s.Object({ optional_properties: { _id: s.Constant(true) } }),  { _id: true });
  match.pass(s.Object({ optional_properties: { _id: s.Constant(true) } }),  {  });
  match.fail(s.Object({ optional_properties: { _id: s.Constant(true) } }),  { _id: false });

  match.pass(s.Object({ required_properties: { _id: s.Or(s.String(), s.Integer()) } }),  { _id: '123', other: 'other' });

  match.fail(s.Object({ required_properties: { _id: s.Or(s.String(), s.Integer()) },
                        allow_other_properties: false }),
             { _id: '123',
               other: 'other' });

  match.pass(s.Object({ required_properties: { _id: s.DontCare() },
                        without_properties: [ '_del' ] }),
             { _id: '123' });

  match.fail(s.Object({ without_properties: [ '_del' ] }), { _del: undefined });
  match.pass(s.Object({ without_properties: [ '_del' ] }), {  });

  match.pass(s.Object({  }), {  });
  match.pass(s.Object({  }), { foo: 'bar' });

});

test('enum', function () {
  match.fail(s.Enum(), null);
  match.fail(s.Enum(), 'a');

  var o = { };
  match.fail(s.Enum(o), 'a');
  match.pass(s.Enum(o), o);

  match.pass(s.Enum('a', o, 42), o);
  match.pass(s.Enum('a', o, 42), 'a');
  match.pass(s.Enum('a', o, 42), 42);
  match.fail(s.Enum('a', o, 42), NaN);
});


test('OfType', function () {
  match.pass(s.Boolean(), true);
  match.pass(s.Boolean(), false);
  match.fail(s.Boolean(), undefined);

  match.fail(s.Number(), undefined);
  match.pass(s.Number(), NaN);
  match.pass(s.Number(), 0);
  match.pass(s.Number(), 1.17);
});

test('array', function () {
  match.pass(s.Array(s.Integer()), [ ]);
  match.pass(s.Array(s.Integer()), [ 1 ]);
  match.pass(s.Array(s.Integer()), [ 1, 2 ]);
  match.fail(s.Array(s.Integer()), [ 'q' ]);
  match.fail(s.Array(s.Integer()), [ 1, 'q' ]);
  match.fail(s.Array(s.Integer()), [ 1, 'q', 2 ]);
  match.fail(s.Array(s.Integer(), s.GreaterThan(0)), [ ]);
  match.pass(s.Array(s.Integer(), s.GreaterThan(0)), [ 1 ]);
  match.pass(s.Array(s.Integer(), s.GreaterThan(0)), [ 1, 2, 3 ]);
  match.pass(s.Array(s.Integer(), s.GreaterThan(2)), [ 1, 2, 3 ]);
  match.fail(s.Array(s.Array(s.Pass()), s.GreaterThan(0)), [ ]);
  match.pass(s.Array(s.Array(s.Pass()), s.GreaterThan(0)), [ [ ], [ ] ]);
});

test('tuple', function () {
  match.pass(s.Tuple(s.Integer()), [ 1 ]);
  match.fail(s.Tuple(s.Integer()), [ 'a' ]);
  match.fail(s.Tuple(s.Integer()), [ 1, 2 ]);
  match.pass(s.Tuple(s.Tuple(s.Integer()), s.GreaterThan(0)), [ [ 1 ], 2 ]);
  match.pass(s.Tuple(s.Tuple(s.Integer()), s.GreaterThan(0)), [ [ 1 ], 1 ]);
  match.fail(s.Tuple(s.Tuple(s.Integer()), s.GreaterThan(0)), [ [ 1 ], 0 ]);
});

test('misc', function () {
  var schema = s.Array(s.Or(s.RegExp(/^[0-9]+$/),
                            s.Integer()).label('a integer or a string like integer'),
                       s.GreaterThan(0));

  //l(schema.constructor);

  var match = schema.test([ 1, '42' ]);

  //console.log(s.formatTrace(match.trace));

});
