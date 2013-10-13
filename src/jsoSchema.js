/* A javascript (json) data structure parser/validator. 
 *
 * Combinators are writte in CPS style: Every combinator is passed a
 * value to check and a function to call if the value passes and a
 * second function to call if the value fails.
 */

var jsoSchema = (function () {

    var s = { };

    /**
     * Short circuiting and.
     *
     * @param {Array.<validator>} conditions
     * @return {validator}
     */
    function Every (conditions) {
        if (conditions.length == 0) {
            return function (value, p, f) { return p(); };
        } else {
            return function (value, p, f) {
                return conditions[0](value,
                                     function () { 
                                         return Every(conditions.slice(1))(value, p, f); 
                                     },
                                     f);
            };
        }
    };

    /**
     * Short circuiting and.
     *
     * @param {...validator} conditions
     * @return {validator}
     */
    function And (conditions) {
        return Every(copyArray(arguments));
    };

    /**
     * Short circuiting or
     *
     * @param {Array.<validator>} conditions
     * @return {validator}
     */
    function Any (conditions) {
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
                                         return Any(conditions.slice(1))(value, p, f);
                                     });
            };
        }
    };

    /**
     * 2 argument Any
     *
     * @param {...validator} conditions
     * @return {validator}
     */
    function Or (conditions) {
        return Any(copyArray(arguments)); 
    };

    function If (condition, then, els) {
        return Or(And(condition, then), els);
    };

    /** 
     * Helper function for simple tests
     * @param {function(*):boolean} valueCheck
     * @return {validator}
     */
    function Condition (valueCheck) {
        return function(value, p, f) {
            return valueCheck(value) ? p() : f(value, " did not return true from ", valueCheck);
        };
    };


    function copyArray (array) {
        return [].slice.call(array, 0);
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
    function typeOf(value) {
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
     * @param {string} typeName
     * @return {validator}
     */
    function OfType (typeName) {
        return Condition(function (value) { return typeOf(value) == typeName; });
    };

    /**
     * @return {validator}
     */
    function Number () {
        return OfType("number");
    };

    /**
     * @param {number} lowerBound
     * @return {validator}
     */
    function GreaterThan (lowerBound) {
        return And(Number(), Condition(function (/**number*/ value) { return lowerBound < value; }));
    };

    /**
     * @param {number} lowerBound
     * @return {validator}
     */
    function GreaterThanEqual (lowerBound) {
        return And(Number(), Condition(function (/**number*/value) { return lowerBound <= value; }));
    };

    /**
     * @param {number} upperBound
     * @return {validator}
     */
    function LessThan (upperBound) {
        return And(Number(), Condition(function (/**number*/value) { return value < upperBound; }));
    };

    /**
     * @param {number} upperBound
     * @return {validator}
     */
    function LessThanEqual (upperBound) {
        return And(Number(), Condition(function (/**number*/value) { return value <= upperBound; }));
    };

    /**
     * @return {validator}
     */
    function Integer () {
        return And(Number(), Condition(function (/**number*/value) { return value % 1 == 0; }));
    };

    /**
     * @return {validator}
     */
    function String () {
        return OfType("string");
    };

    /**
     * @return {validator}
     */
    function Boolean () {
        return OfType("boolean");
    };

    /**
     * @param {string|RegExp} re
     * @return {validator}
     */
    function Test (re) {
        if (typeOf(re) == "string") {
            re = new RegExp(re);
        }
        return And(String(), Condition(function (value) { return re.exec(value) != null; }));
    };

    /**
     * @param {Array.<*>} values
     * @return {validator}
     */
    function Enum (values) {
        var set = { };
        var i;
        for (i = 0; i < values.length; i++) {
            set[values[i]] = true;
        }
        return Condition(function (value) { return set.hasOwnProperty(value); });
    };

    /**
     * @param {...*} var_args
     * @return {validator}
     */
    function OneOf (var_args) {
        return Enum(copyArray(arguments));
    };


    /**
     * @param {*} value
     * @return {validator}
     */
    function Constant (value) {
        return Condition(function (v) { return v === value; });
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

    function Object (spec) {
        return function (value, p, f) {
            spec = { required_properties: spec['required_properties'] || { },
                     optional_properties: spec['optional_properties'] || { },
                     allow_other_properties: typeOf(spec['allow_other_properties']) == "undefined" ? true : spec['allow_other_properties'] };
            object_schema_loop(spec,
                               spec.required_properties,
                               spec.optional_properties,
                               spec.allow_other_properties,
                               value,
                               p,
                               f);
        };
    };

    function Record (required_properties) {
        return Object({ required_properties: required_properties, 
                        allow_other_properties: false });
    };

    function HashTable () {
        return Object({ allow_other_properties: true });
    };

    /**
     * @param {validator} item_validator
     * @return {validator}
     */
    function Array (item_validator) {
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

    function Tuple (items) {
        items = copyArray(arguments);
        return And(OfType("array"),
                   function (value, p, f) {
                       if (items.length != value.length) {
                           f("Wrong number f elements in tuple",value,"expected",items.length);
                       } else {
                           var loop = function (index) {
                               if (value.length == index) {
                                   p();
                               } else {
                                   items[index](value[index],
                                                function () { loop(index + 1); },
                                                f);
                               }
                           };
                           loop(0);
                       };
                   });
    };

    function Nullable (validator) {
        return Or(Constant(null), validator);
    };

    function Pass () { return function (value,p,f) { return p(); }; };
    function Fail () { var message = [].concat(arguments); return function (value,p,f) { return f.apply(f, message); }; };

    function violatesSchema (value, schema) {
        var error = undefined;
        var ok = false;
        schema(value,
               function () { ok = true; },
               function () { error = { value: value, schema: schema, message: [].concat(arguments) }; });

        return ok ? false : error;
    };

    function validate (value, schema) {
        return violatesSchema(value, schema) == false ? true : false;
    };

    return { 'Every': Every,
             'And':   And,
             'Any':   Any,
             'Or':    Or,
             'If':    If,
             'OfType': OfType,
             'Condition': Condition,
             'Number': Number,
             'Integer': Integer,
             'GreaterThan': GreaterThan,
             'GreaterThanEqual': GreaterThanEqual,
             'LessThan': LessThan,
             'LessThanEqual': LessThanEqual,
             'String': String,
             'Boolean': Boolean,
             'Test': Test,
             'Enum': Enum,
             'OneOf': OneOf,
             'Constant': Constant,
             'Object': Object,
             'Record': Record,
             'HashTable': HashTable,
             'Array': Array,
             'Tuple': Tuple,
             'Nullable': Nullable,
             'Pass': Pass,
             'Fail': Fail,
             'violatesSchema': violatesSchema,
             'validate': validate
           };
})();
