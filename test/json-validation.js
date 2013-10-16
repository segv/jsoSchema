var requirejs = require('requirejs');
requirejs([ '../build/min/jso/Schema', 'buster' ], function (s, buster) { buster.testCase("Examples", { "example": function () {

    // just some helper code. valid() means the current schema
    // validates the current data, invalid means it doesn't
    var schema, data;
    var valid   = function () { buster.assert(s.validate(data, schema)); };
    var invalid = function () { buster.refute(s.validate(data, schema)); };

    // Sample data:

    data = { users: [ { id: 1, username: "davidwalsh", numPosts: 404, realName: "David Walsh" },
	              { id: 2, username: "russianprince", numPosts: 12, realName: "Andrei Arshavin" } ]
           };

    /* json-validation: */

    var v = {
	"type" : "object",
	"properties" : {
	    "users" : {
		"type" : "array", // remember that arrays are objects
		"items" : { // "items" represents the items within the "users" array
		    "type" : "object",
		    "properties" : {
			"id": { "type": "number" },
			"username": { "type" : "string" },
			"numPosts": { "type" : "number" },
			"realName": { "type" : "string", optional: true }
		    }
		}
	    }
	}
    };

    /* as jsoSchema */

    schema = s.Record({ users: s.Array(s.Record({ id: s.Number(),
                                                  username: s.String(),
                                                  numPosts: s.Number() },
                                                { realName: s.String() })) });

    /* json-schema */

    v = { "title": "Example Schema",
	  "type": "object",
	  "properties": {
	      "firstName": { "type": "string" },
	      "lastName": { "type": "string" },
	      "age": {
		  "description": "Age in years",
		  "type": "integer",
		  "minimum": 0
	      }
	  },
	  "required": ["firstName", "lastName"] };

    /* as jsoSchema. NB: We lose the ability to include the title and
     * descriptions inside our schema. */

    schema = s.Record({ firstName: s.String(),
                        lastName:  s.String() },
                      { age: s.GreaterThanEqual(0) /* age in years */ });

    /* json-schema's product catalog example */

    v = {
        "$schema": "http://json-schema.org/draft-04/schema#",
        "title": "Product set",
        "type": "array",
        "items": {
            "title": "Product",
            "type": "object",
            "properties": {
                "id": {
                    "description": "The unique identifier for a product",
                    "type": "number"
                },
                "name": {
                    "type": "string"
                },
                "price": {
                    "type": "number",
                    "minimum": 0,
                    "exclusiveMinimum": true
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "minItems": 1,
                    "uniqueItems": true
                },
                "dimensions": {
                    "type": "object",
                    "properties": {
                        "length": {"type": "number"},
                        "width": {"type": "number"},
                        "height": {"type": "number"}
                    },
                    "required": ["length", "width", "height"]
                },
                "warehouseLocation": {
                    "description": "Coordinates of the warehouse with the product",
                    "$ref": "http://json-schema.org/geo"
                }
            },
            "required": ["id", "name", "price"]
        }
    };

    /* as jsoSchema */

    // again, we lose the ability to add description (other than
    // source level comments) and reference external schemas.

    // jsoSchema doesn't have the uniqueItems property, so define it here.
    var UniqueItems = function () {
        return s.Condition(function (array) {
            var i;
            var set = { };
            for (i = 0; i < array.length; i++) {
                if (set[array[i]]) {
                    return false;
                }
                set[array[i]] = true;
            }
            return true;
        });
    };

    // as per http://json-schema.org/geo 
    var geoSchema = s.Record({ latitude: s.Number(),
                               longitude: s.Number() });

    schema = s.Array(s.Record({ id: s.Number(), /* The unique identifier for a product */
                                name: s.String(),
                                price: s.GreaterThan(0) },
                              { tags: s.And(s.Array(s.String(), s.GreaterThan(0)),
                                            UniqueItems()),
                                dimensions: s.Record({ length: s.Number(),
                                                       width: s.Number(),
                                                       height: s.Number() }),
                                // json schema can not grab other
                                // schema from other URLs. we to down
                                // load, read, and just include this
                                // schema directly.
                                warehouseLocation: geoSchema /* Coordinates of the warehouse with the product */
                              }));

} }); });

