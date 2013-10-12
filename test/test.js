var requirejs = require('requirejs');
//define = requirejs.define;
requirejs([ '../build/jsoSchema', 'buster' ], function (s, buster) {

    var valid   = function (value, schema) { buster.assert(s.validate(value, schema)); };
    var invalid = function (value, schema) { buster.refute(s.validate(value, schema)); };

    buster.testCase("Flat schemas", {
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
            
        },
        "string": function () {
            valid("", s.String());
            valid("A", s.String());
            invalid(0, s.String());
            valid(typeof(0), s.String());
        },
        "oftype": function () {
            valid("", s.OfType("string"));
            invalid("", s.OfType("object"));
            invalid(s, s.OfType("number"));
            invalid(s, s.OfType("undefined"));
            valid(s, s.OfType("object"));
            valid(s.OfType, s.OfType("function"));
            valid(undefined, s.OfType("undefined"));
        },
        "constant": function () {
            valid(1, s.Constant(1));
        },
        "and": function () {
            valid(1, s.And(s.Constant(1), s.Constant(1)));
        }
    });
});
