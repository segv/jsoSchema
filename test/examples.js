var requirejs = require('requirejs');
requirejs([ '../build/min/jso/Schema', 'buster' ], function (s, buster) { buster.testCase("Examples", { "example": function () {

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
                        address: s.Pass() });

    invalid(); // need to update the data

    data = { name: "marco", address: NaN };

    valid();

    /* ok, we have an address property, but it probably can't be
     * anything at all. let's decide that the address has to be a list
     * of strings (what each string means we don't know nor really
     * care about): */
    schema = s.Record({ name: s.String(),
                        address: s.Array(s.String()) });

    invalid(); // NaN isn't an array of strings

    data = { name: "marco", address: [ "the street."] };

    valid();

    data = { name: "marco", address: [ ] };

    valid();

    /* do we really want an empty array to be ok? let's make it even
     * more specific: we'll allow null, or an array of strings of
     * length > 0 */

    /* oh, wait, they have to have an age too: */

    schema = s.Record({ name: s.String(),
                        address: s.Array(s.String(), s.GreaterThan(0)) });

    invalid(); // our zero length array isn't allowed anymore.

    data = { name: "marco", address: [ "the street."] };

    valid();

    /* We said before that we'd accept either an array of length > 0
     * or null. To combine schemas, using boolean conditions like and
     * and or, we use the schema combining functions: */

    schema = s.Record({ name: s.String(),
                        address: s.Or(s.Array(s.String(), 
                                              s.GreaterThan(0)),
                                      s.Constant(null)) });

    valid(); // our current data is still valid.

    data = { name: "marco", address: [ ] };
    invalid(); // zero length arrays aren't allowed

    data = { name: "marco", address: null };
    valid(); // but null is.

    /* Schemas can very quickly become large unweidly things, so it's
     * nice to have a way to break them up and refer to them as
     * smaller components. jsoSchema does this, very simply, via
     * javascript: */

    var StringArray = function () { return s.Array(s.String(), s.GreaterThan(0)); };

    schema = s.Record({ name: s.String(),
                        address: s.Or(StringArray(), s.Constant(null)) });

    var Nullable = function (schema) { return s.Or(s.Constant(null), schema); };

    schema = s.Record({ name: s.String(),
                        address: Nullable(StringArray()) });

    valid();

    data = { name: "marco", address: [ "the street" ] };

    valid();

    var v1 = s.Record({ version: s.Constant("1"), name: s.String(), address: Nullable(StringArray()) });
    var v2 = s.Record({ version: s.Constant("2"), name: s.String(), address: StringArray(), age: s.Integer() });

    schema = s.Or(s.And(s.Object({ required_properties: { version: s.Constant("1") } }), v1),
                  s.And(s.Object({ required_properties: { version: s.Constant("2") } }), v2));

    data = { version: "1", name: "marco", address: null };
    valid();

    /* but wow, that's an unreadable mess. it'd be much cleaner if we
     * could just write the version test explicity: */

    var IfVersion = function (version, schema) {
        return s.And(s.Object({ required_properties: { version: s.Constant(version) } }), 
                     schema);
    };

    schema = s.Or(IfVersion("1", v1),
                  IfVersion("2", v2));

    /* that's better. now see what happens with some data: */

    data = { version: "1", name: "marco", address: null };
    valid();

    data = { version: "2", name: "marco", address: null };
    invalid();

    data = { version: "2", name: "marco", address: [ "the street" ] };
    invalid();

    data = { version: "2", name: "marco", address: [ "the street" ], age: 63 };
    valid();

    } }); });

