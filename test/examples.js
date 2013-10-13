var requirejs = require('requirejs');
requirejs([ '../build/min/jso/Schema', 'buster' ], function (s, buster) {

    // just some helper code. valid() means the current schema
    // validates the current data, invalid means it doesn't
    var schema, data;
    var valid   = function () { buster.assert(s.validate(data, schema)); };
    var invalid = function () { buster.refute(s.validate(data, schema)); };

    /* Let's say we have a bunch of people objects, and they must all
     * have a name, which itself has to be a string: */

    data = { name: "marco" };
    schema = s.Record({ name: s.String() });
    valid();

    /* But that's probably wrong, they probably have an address field too,
     * but we don't know anything about it: */

    schema = s.Record({ name: s.String(),
                        address: s.Object() });
    
    /* actually, we do, we know that the address has to be a list of strings
     * (what each string means we don't know nor really care about): */
    schema = s.Record({ name: s.String(),
                        address: s.Array(s.String()) });

    /* oh, wait, they have to have an age too: */
 
    schema = s.Record({ name: s.String(),
                        address: s.Array(s.String()),
                        age: s.Number() });

    /* but, now that I think about it, not just any number, an integer
     * (we don't allow kids who really want to specify that they're
     * 3.5 years and not 3 years old): */
 
    schema = s.Record({ name: s.String(),
                        address: s.Array(s.String()),
                        age: s.Integer() });

    /* but, let's be pedantic. It's a positive number (actually it has
     * to be greater than 25, since our web site sells souls, and we
     * all know the devil doesn't want un-ripe souls): */
 
    schema = s.Record({ name: s.String(),
                        address: s.Array(s.String()),
                        age: s.And(s.Integer(), s.GreaterThanEquals(25)) });

    /* thats our first example of combining schemas (we'd use &&
     * directly if javascript would let us override operators, but it
     * doesn't, so we won't). jsoSchema defines a few schema which
     * combine other schemas: And, Or, Every and Any (and If, but we'll
     * ignore that for now). */

});
