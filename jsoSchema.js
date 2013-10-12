/* A javascript (json) data structure parser/validator. 
 *
 * Combinators are writte in CPS style: Every combinator is passed a
 * value to check and a function to call if the value passes and a
 * second function to call if the value fails.
 */

var jsoSchema = { };

/** @typedef {function(*, continuation)} */
jsoSchema.validator;

/**
 * Short circuiting and.
 *
 * @nosideeffects
 * @param {Array.<jsoSchema.validator>} conditions
 * @return {validator}
 */
jsoSchema.Every = function Every (conditions) {
    if (conditions.length == 0) {
        return function (value, p, f) { return p(); };
    } else {
        return function (value, p, f) {
            return conditions[0](value,
                                 function () { 
                                     return jsoSchema.Every(conditions.slice(1))(value, p, f); 
                                 },
                                 f);
        };
    }
};

jsoSchema.And = function And (a, b) {
    return jsoSchema.Every([a,b]);
};

/**
 * Short circuiting or
 *
 * @nosideeffects
 * @param {Array.<validator>} conditions
 * @return {validator}
 */
jsoSchema.Any = function Any (conditions) {
    if (conditions.length == 0) {
        return function (value, p, f) {
            return f("Testing ", value, "against an empty Any list");
        };
    } else {
        return function (value, p, f) {
            return conditions[0](value,
                                 function () {
                                     return p();
                                 },
                                 function () {
                                     return jsoSchema.Any(conditions.slice(1))(value, p, f);
                                 });
        };
    }
};

/**
 * 2 argument Any
 *
 * @nosideeffects
 * @param {validator} a
 * @param {validator} b
 * @return {validator}
 */
jsoSchema.Or = function Or (a, b) {
    return jsoSchema.Any([ a, b ]); 
};

jsoSchema.If = function If (condition, then, els) {
    return jsoSchema.Or(jsoSchema.And(condition, then), els);
};

/** 
 * Helper function for simple tests
 * @param {function(*):boolean} valueCheck
 * @return {validator}
 */
jsoSchema.Condition = function Condition (valueCheck) {
    return function(value, p, f) {
        return valueCheck(value) ? p() : f(value, " did not return true from ", valueCheck);
    };
};

/**
 * Return type, as string, of the passed in object. Distinguish
 * between null, arrays and objects.
 *
 * as per http://javascript.crockford.com/remedial.html
 *
 * @param {*} value
 * @return {string}
 */
jsoSchema.typeOf = function typeOf(value) {
    var s = typeof value;
    if (s === 'object') {
        if (value) {
            if (Object.prototype.toString.call(value) == '[object Array]') {
                return 'array';
            }
        } else {
            return 'null';
        }
    }
    return s;
};

/**
 * @nosideeffects
 * @param {typeName} string
 * @return {validator}
 */
jsoSchema.OfType = function OfType (typeName) {
    return jsoSchema.Condition(function (value) { return jsoSchema.typeOf(value) == typeName; });
};

/**
 * @nosideeffects
 * @return {validator}
 */
jsoSchema.Number = function Number () {
    return jsoSchema.OfType("number");
};

/**
 * @nosideeffects
 * @param {number} lowerBound
 * @return {validator}
 */
jsoSchema.GreaterThan = function GreaterThan (lowerBound) {
    return jsoSchema.And(jsoSchema.Number(), jsoSchema.Condition(function (value) { return lowerBound < value; }));
};

/**
 * @nosideeffects
 * @param {number} lowerBound
 * @return {validator}
 */
jsoSchema.GreaterThanEqual = function GreaterThanEqual (lowerBound) {
    return jsoSchema.And(jsoSchema.Number(), jsoSchema.Condition(function (value) { return lowerBound <= value; }));
};

/**
 * @nosideeffects
 * @param {number} upperBound
 * @return {validator}
 */
jsoSchema.LessThan = function LessThan (upperBound) {
    return jsoSchema.And(jsoSchema.Number(), jsoSchema.Condition(function (value) { return value < upperBound; }));
};

/**
 * @nosideeffects
 * @param {number} upperBound
 * @return {validator}
 */
jsoSchema.LessThanEqual = function LessThanEqual (upperBound) {
    return jsoSchema.And(jsoSchema.Number(), jsoSchema.Condition(function (value) { return value <= upperBound; }));
};

/**
 * @nosideeffects
 * @return {validator}
 */
jsoSchema.String = function String () {
    return jsoSchema.OfType("string");
};

/**
 * @nosideeffects
 * @return {validator}
 */
jsoSchema.Boolean = function Boolean () {
    return jsoSchema.OfType("boolean");
};

/**
 * @nosideeffects
 * @param {string|RegExp} re
 * @return {validator}
 */
jsoSchema.RegExp = function RegExp (re) {
    if (jsoSchema.typeOf(re) == "string") {
        re = new RegExp(re);
    }
    return jsoSchema.And(jsoSchema.String(), jsoSchema.Condition(function (value) { return re.exec(value) != null; }));
};

/**
 * @nosideeffects
 * @param {Array.<*>} values
 * @return {validator}
 */
jsoSchema.Enum = function Enum (values) {
    var set = { };
    var i;
    for (i = 0; i < values.length; i++) {
        set[values[i]] = true;
    }
    return jsoSchema.Condition(function (value) { return set.hasOwnProperty(value); });
};

/**
 * @nosideeffects
 * @param {*} value
 * @return {validator}
 */
jsoSchema.Constant = function Constant (value) {
    return jsoSchema.Condition(function (v) { return v == value; });
};

jsoSchema.Object = (function () { 

    var check_one_required_property = function(spec,
                                               required_properties, optional_properties, allow_other_properties,
                                               value, p, f) {
        
        var property = required_properties[0];
        var property_schema = spec.required_properties[property];

        if (jsoSchema.typeOf(value[property]) == "undefined") {
            return f("Missing required property ", property, " on ", value);
        } else {
            return property_schema(value[property],
                                   function () {
                                       return object_schema_loop(spec,
                                                                 required_properties.slice(1),
                                                                 optional_properties,
                                                                 allow_other_properties,
                                                                 value,
                                                                 p,
                                                                 f);
                                   },
                                   f);
        }
    };

    var check_one_optional_property = function (spec,
                                                required_properties, optional_properties, allow_other_properties,
                                                value, p, f) {
        var property = optional_properties[0];
        var property_schema = spec.optional_properties[property];
        return property_schema(value[property],
                               function () {
                                   return object_schema_loop(spec,
                                                             required_properties,
                                                             optional_properties.slice(1),
                                                             allow_other_properties,
                                                             value,
                                                             p,
                                                             f);
                               },
                               f);
    };

    var forIn = function (o, callback) {
        var value;
        for (value in o) {
            if (o.hasOwnProperty(value)) {
                callback(o[value], value);
            }
        }
    };

    var keys = function (o) {
        var k = [ ];
        forIn(o, function (value, key) { k.push(key); });
        return k;
    };

    var check_extra_properties = function (spec,
                                           required_properties, optional_properties, allow_other_properties,
                                           value, p, f) {

        var value_properties = { };
        
        forIn(value, function (v, property) { value_properties[property] = true; });
        
        forIn(required_properties,
              function (v, property) {
                  delete value_properties[property];
              });
        forIn(optional_properties,
              function (v, property) {
                  delete value_properties[property];
              });

        if (keys(value_properties).length > 0) {
            return f("Extra keys,", value_properties, " in ", value);
        } else {
            return p();
        }
    };

    var object_schema_loop = function (spec,
                                       required_properties, optional_properties, allow_other_properties,
                                       value, p, f) {
        if (required_properties.length > 0) {
            return check_one_required_property(spec,
                                               required_properties, optional_properties, allow_other_properties,
                                               value, p, f);
        } else if (optional_properties.length > 0) {
            return check_one_optional_property(spec,
                                               required_properties, optional_properties, allow_other_properties,
                                               value, p, f);
        } else if (allow_other_properties == false) {
            return check_extra_properties(spec,
                                          required_properties, optional_properties, allow_other_properties,
                                          value, p, f);
        } else {
            return p();
        }
    };

    return function Object (spec) {
        return function (value, p, f) {
            object_schema_loop(spec,
                               spec.required_properties || { },
                               spec.optional_properties || { },
                               jsoSchema.typeOf(spec.allow_other_properties) == "undefined" ? true : spec.allow_other_properties,
                               value,
                               p,
                               f);
        };
    };

})();

jsoSchema.Record = function Record (required_properties) {
    return jsoSchema.Object({ required_properties: required_properties, 
                                  optional_properties: { } });
};

jsoSchema.HashTable = function HashTable () {
    return jsoSchema.Object({ required_properties: { }, 
                                  optional_properties: { },
                                  allow_other_properties: true });
};

/**
 * @param {jsoSchema.validator} item_validator
 * @return {jsoSchema.validator}
 */
jsoSchema.Array = function Array (item_validator) {
    if (arguments.length == 0) {
        throw new Error("Missing required argument item_validator");
    }
    return function (value, p, f) {
        var loop = function (index, p, f) {
            if (index == value.length) {
                return p();
            } else {
                return item_validator(value[index],
                                      function () {
                                          return loop(index + 1, p, f);
                                      },
                                      f);
            }
        };

        if (jsoSchema.typeOf(value) == 'array') {
            return loop(0, p, f);
        } else {
            return f(value, "is not an array.");
        }
    };
};

jsoSchema.Nullable = function Nullable (validator) {
    return jsoSchema.Or(jsoSchema.Constant(null), validator);
};

jsoSchema.Pass = function Pass () { return function (value,p,f) { return p(); }; };
jsoSchema.Fail = function Fail () { var message = [].concat(arguments); return function (value,p,f) { return f.apply(f, message); }; };

jsoSchema.violatesSchema = function violatesSchema (value, schema) {
    var error = undefined;
    var ok = false;
    schema(value,
           function () { ok = true; },
           function () { error = { value: value, schema: schema, message: [].concat(arguments) }; });

    return ok ? false : error;
};

jsoSchema.validate = function validate (value, schema) {
    return jsoSchema.violatesSchema(value, schema) == false ? true : false;
};
