var requirejs = require('requirejs');
requirejs([ '../build/min/jso/Schema', 'buster' ], function (s, buster) {

    var valid   = function (value, schema) { buster.assert(s.validate(value, schema)); };
    var invalid = function (value, schema) { buster.refute(s.validate(value, schema)); };

    buster.testCase("jsoSchema", {
        "conditions": function () {
            valid(0, s.Condition(function (value) { return value == 0; }));
        },
        "number" : function () {
            valid(0, s.Number());
            valid(0 + 0, s.Number());
            valid(1.0, s.Number());
            valid(Math.random(), s.Number());
            invalid("", s.Number());
            invalid("a", s.Number());
            invalid({}, s.Number());
            invalid(null, s.Number());
        },
        "numberConditions": function () {
            valid(1, s.GreaterThan(0));
            valid(1, s.GreaterThanEqual(1));
            valid(1, s.LessThan(2));
            valid(1, s.LessThanEqual(1));
        },
        "integer": function () {
            valid(0, s.Integer());
            valid(-0, s.Integer());
            valid(-1, s.Integer());
            valid(1, s.Integer());
            valid(Number.MAX_VALUE, s.Integer());
        },
        "array": function () {
            valid([ 1 ], s.Array(s.Number()));
            valid( [ "" ],s.Array(s.String()));
            invalid( [ "" ],s.Array(s.Number()));
            valid([], s.Array(s.Pass()));
            // the array validator shouldn't be called for a 0 length array
            valid([], s.Array(s.Fail()));

            valid(new Array(), s.Array(s.Pass()));
            valid([1,2,3], s.Array(s.Number()));
            valid((function () { return [].slice.call(arguments); })(1,2,3), s.Array(s.Number()));

            var digit_list = s.Array(s.Or(s.Number(), s.Test(/^\d+$/)),
                                     s.GreaterThan(0));

            valid([1], digit_list);
            valid([1,"2",3], digit_list);
            valid([1,2,3,4], digit_list);
            invalid([1,{},3,4], digit_list);
            invalid([], digit_list);
            invalid({ 2: undefined }, digit_list);
            
        },
        "string": function () {
            valid("", s.String());
            valid("A", s.String());
            invalid(0, s.String());
            valid(typeof(0), s.String());
            valid("aaab", s.Test("^a+b+$"));
        },
        "ofType": function () {
            valid("", s.OfType("string"));
            invalid("", s.OfType("object"));
            invalid(s, s.OfType("number"));
            invalid(s, s.OfType("undefined"));
            valid(s, s.OfType("object"));
            valid(s.OfType, s.OfType("function"));
            valid(undefined, s.OfType("undefined"));
            valid({}['foo'], s.OfType("undefined"));
        },
        "constant": function () {
            valid(1, s.Constant(1));
        },
        "and": function () {
            valid(undefined, s.And(s.Pass(), s.Pass()));
            invalid(undefined, s.And(s.Pass(), s.Fail()));
            invalid(undefined, s.And(s.Fail(), s.Fail()));

            valid(1, s.And(s.Constant(1), s.Constant(1)));
            valid(1, s.And(s.LessThan(2), s.GreaterThan(0)));

            valid(1, s.And(s.And(s.Constant(1)), 
                           s.And(), 
                           s.And(s.Constant(1), 
                                 s.Constant(1))));
        },
        "or": function () {
            valid(undefined, s.Or(s.Pass(), s.Pass()));
            valid(undefined, s.Or(s.Fail(), s.Pass()));
            invalid(undefined, s.Or(s.Fail(), s.Fail()));
            valid(1, s.Or(s.Constant(0), s.Constant(1)));
            valid(1, s.Or(s.LessThan(0), s.GreaterThan(0)));
        },
        "record": function () {
            valid({ a: 42 }, s.Record({ a: s.Number() }));
            invalid({ b: 42 }, s.Record({ a: s.Number() }));
            invalid({ b: 42 }, s.Record({ a: s.Pass() }));
            invalid({ b: 42 }, s.Record({ b: s.Pass(), a: s.Pass() }));
            valid({ b: 42, c: 1 }, s.Object({ required_properties: { b: s.Pass() }, 
                                              allow_other_properties: true }));
            invalid({ b: 42, c: 1 }, s.Object({ required_properties: { b: s.Pass() }, 
                                                allow_other_properties: false }));
            valid({ b: 42, c: 1 }, s.Object({ required_properties: { b: s.Pass() }, 
                                              optional_properties: { c: s.Pass() },
                                              allow_other_properties: false }));
            invalid({ b: 42, c: 1 }, s.Object({ required_properties: { b: s.Pass() }, 
                                                optional_properties: { c: s.Fail() },
                                                allow_other_properties: false }));
        },
        "nested conditions": function () {
            valid(1, s.Or(s.And(s.GreaterThan(0),
                                s.GreaterThan(1)),
                          s.And(s.LessThan(2),
                                s.GreaterThan(0))));

            var validator = s.Or(s.And(s.Object({ required_properties: { v: s.Constant(1) } }),
                                       s.Record({ v: s.Constant(1), a: s.Constant(3) })),
                                 s.And(s.Object({ required_properties: { v: s.Constant(2) } }),
                                       s.Record({ v: s.Constant(2), b: s.String() })));

            valid({ v: 1, a: 3 }, validator);
            valid({ v: 2, b: "3" }, validator);                               
        },
        "enum": function () {
            invalid("FOO", s.Enum("A", "B", "C"));
            invalid("FOO", s.OneOf(["A", "B", "C"]));
            valid("B", s.Enum("A", "B", "C"));
            valid("C", s.OneOf(["A", "B", "C"]));
            valid("C", s.OneOf(["C"]));
            invalid("C", s.OneOf([]));
        },
        "tuple": function () {
            valid([1,2], s.Tuple(s.Number(),s.Number()));
            invalid([1], s.Tuple(s.Number(),s.Number()));
            invalid([1,2,3], s.Tuple(s.Number(),s.Number()));
            invalid([1,"2"], s.Tuple(s.Number(),s.Number()));
            invalid({}, s.Tuple(s.Number(),s.Number()));
        }
    });
});
