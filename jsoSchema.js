/* A javascript (json) data structure parser/validator. 
 *
 * Combinators are writte in CPS style: Every combinator is passed a
 * value to check and a function to call if the value passes and a
 * second function to call if the value fails.
 */

var jsoSchema = (function () {

    var s = { };

    /** @typedef {function(*, continuation)} */
    var validator;

    /**
     * Short circuiting and.
     *
     * @nosideeffects
     * @param {Array.<jsoSchema.validator>} conditions
     * @return {validator}
     */
    s.Every = function Every (conditions) {
        if (conditions.length == 0) {
            return function (value, p, f) { return p(); };
        } else {
            return function (value, p, f) {
                return conditions[0](value,
                                     function () { 
                                         return s.Every(conditions.slice(1))(value, p, f); 
                                     },
                                     f);
            };
        }
    };

    s.And = function And (a, b) {
        return s.Every([a,b]);
    };

    /**
     * Short circuiting or
     *
     * @nosideeffects
     * @param {Array.<validator>} conditions
     * @return {validator}
     */
    s.Any = function Any (conditions) {
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
                                         return s.Any(conditions.slice(1))(value, p, f);
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
    s.Or = function Or (a, b) {
        return s.Any([ a, b ]); 
    };

    s.If = function If (condition, then, els) {
        return s.Or(s.And(condition, then), els);
    };

    /** 
     * Helper function for simple tests
     * @param {function(*):boolean} valueCheck
     * @return {validator}
     */
    s.Condition = function Condition (valueCheck) {
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
    var typeOf = function typeOf(value) {
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
    s.OfType = function OfType (typeName) {
        return s.Condition(function (value) { return typeOf(value) == typeName; });
    };

    /**
     * @nosideeffects
     * @return {validator}
     */
    s.Number = function Number () {
        return s.OfType("number");
    };

    /**
     * @nosideeffects
     * @param {number} lowerBound
     * @return {validator}
     */
    s.GreaterThan = function GreaterThan (lowerBound) {
        return s.And(s.Number(), s.Condition(function (value) { return lowerBound < value; }));
    };

    /**
     * @nosideeffects
     * @param {number} lowerBound
     * @return {validator}
     */
    s.GreaterThanEqual = function GreaterThanEqual (lowerBound) {
        return s.And(s.Number(), s.Condition(function (value) { return lowerBound <= value; }));
    };

    /**
     * @nosideeffects
     * @param {number} upperBound
     * @return {validator}
     */
    s.LessThan = function LessThan (upperBound) {
        return s.And(s.Number(), s.Condition(function (value) { return value < upperBound; }));
    };

    /**
     * @nosideeffects
     * @param {number} upperBound
     * @return {validator}
     */
    s.LessThanEqual = function LessThanEqual (upperBound) {
        return s.And(s.Number(), s.Condition(function (value) { return value <= upperBound; }));
    };

    /**
     * @nosideeffects
     * @return {validator}
     */
    s.String = function String () {
        return s.OfType("string");
    };

    /**
     * @nosideeffects
     * @return {validator}
     */
    s.Boolean = function Boolean () {
        return s.OfType("boolean");
    };

    /**
     * @nosideeffects
     * @param {string|RegExp} re
     * @return {validator}
     */
    s.RegExp = function RegExp (re) {
        if (typeOf(re) == "string") {
            re = new RegExp(re);
        }
        return s.And(s.String(), s.Condition(function (value) { return re.exec(value) != null; }));
    };

    /**
     * @nosideeffects
     * @param {Array.<*>} values
     * @return {validator}
     */
    s.Enum = function Enum (values) {
        var set = { };
        var i;
        for (i = 0; i < values.length; i++) {
            set[values[i]] = true;
        }
        return s.Condition(function (value) { return set.hasOwnProperty(value); });
    };

    /**
     * @nosideeffects
     * @param {*} value
     * @return {validator}
     */
    s.Constant = function Constant (value) {
        return s.Condition(function (v) { return v == value; });
    };

    var check_one_required_property = function(spec,
                                               required_properties, optional_properties, allow_other_properties,
                                               value, p, f) {
        
        var property = required_properties[0];
        var property_schema = spec.required_properties[property];

        if (typeOf(value[property]) == "undefined") {
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

    s.Object = function Object (spec) {
        return function (value, p, f) {
            object_schema_loop(spec,
                               spec.required_properties || { },
                               spec.optional_properties || { },
                               typeOf(spec.allow_other_properties) == "undefined" ? true : spec.allow_other_properties,
                               value,
                               p,
                               f);
        };
    };

    s.Record = function Record (required_properties) {
        return s.Object({ required_properties: required_properties, 
                          optional_properties: { } });
    };

    s.HashTable = function HashTable () {
        return s.Object({ required_properties: { }, 
                          optional_properties: { },
                          allow_other_properties: true });
    };

    /**
     * @param {s.validator} item_validator
     * @return {s.validator}
     */
    s.Array = function Array (item_validator) {
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

            if (typeOf(value) == 'array') {
                return loop(0, p, f);
            } else {
                return f(value, "is not an array.");
            }
        };
    };

    s.Nullable = function Nullable (validator) {
        return s.Or(s.Constant(null), validator);
    };

    s.Pass = function Pass () { return function (value,p,f) { return p(); }; };
    s.Fail = function Fail () { var message = [].concat(arguments); return function (value,p,f) { return f.apply(f, message); }; };

    s.violatesSchema = function violatesSchema (value, schema) {
        var error = undefined;
        var ok = false;
        schema(value,
               function () { ok = true; },
               function () { error = { value: value, schema: schema, message: [].concat(arguments) }; });

        return ok ? false : error;
    };

    s.validate = function validate (value, schema) {
        return s.violatesSchema(value, schema) == false ? true : false;
    };

    return s;

})();
