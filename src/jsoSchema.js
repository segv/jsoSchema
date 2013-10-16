/*
 * Copyright 2013 Edward Marco Baringer
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you
 * may not use this file except in compliance with the License.  You
 * may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
 * implied.  See the License for the specific language governing
 * permissions and limitations under the License.
 */
var jsoSchema = (function () {

    var s = { };

    /**
     * Return true if @param{schema} accepts @param{value}
     *
     * @param {*} value
     * @param {schema} schema
     * @return boolean
     */
    s.validate = function validate (value, schema) {
        return s.violatesSchema(value, schema) == false ? true : false;
    };

    /**
     * Return the errors (probably only one) encountered while
     * test @param{value} against @param{schema}. Returns false if no
     * errors occured.
     *
     * @param {*} value
     * @param {schema} schema
     * @return (false|{value,schema,message})
     */
    s.violatesSchema = function violatesSchema (value, schema) {
        var error = undefined;
        var ok = false;
        schema(value,
               function TopLevelPass () { ok = true; },
               function TopLevelFail () { error = { 'value': value, 'schema': schema, 'message': copyArray(arguments) }; });

        return ok ? false : error;
    };

    /**
     * Short circuiting and.
     *
     * @param {...schema} conditions
     * @return {schema}
     */
    s.And = function And (conditions) {
        return s.Every(copyArray(arguments));
    };

    /**
     * Short circuiting and.
     *
     * @param {Array.<schema>} conditions
     * @return {schema}
     */
    s.Every = function Every (conditions) {
        return function Every (value, p, f) {
            var loop = function EveryLoop (index) {
                if (index == conditions.length) {
                    p();
                } else {
                    conditions[index](value,
                                      function EveryLoopNext () { loop(index + 1); },
                                      f);
                }
            };
            loop(0);
        };
    };

    /**
     * Short circuiting or.
     *
     * @param {...schema} conditions
     * @return {schema}
     */
    s.Or = function Or (conditions) {
        return s.Any(copyArray(arguments)); 
    };

    /**
     * Short circuiting or
     *
     * @param {Array.<schema>} conditions
     * @return {schema}
     */
    s.Any = function Any (conditions) {
        return function Any (value, p, f) {
            var loop = function AnyLoop (index) {
                if (index == conditions.length) {
                    f();
                } else {
                    conditions[index](value,
                                      p,
                                      function AnyLoopNext () { loop(1 + index); });
                }
            };
            loop(0);
        };
    };

    s.If = function If (condition, then, els) {
        return s.Or(s.And(condition, then), els);
    };

    /** 
     * Helper function for simple tests.
     *
     * @param {function(*):boolean} valueCheck
     * @return {schema}
     */
    s.Condition = function Condition (valueCheck) {
        return function Condition (value, p, f) {
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
    s.typeOf = function typeOf (value) {
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
     * @return {schema}
     */
    s.OfType = function OfType (typeName) {
        return s.Condition(function OfTypeCondition (value) { return s.typeOf(value) == typeName; });
    };

    /**
     * @return {schema}
     */
    s.Number = function Number () {
        return s.OfType("number");
    };

    /**
     * @param {number} lowerBound
     * @return {schema}
     */
    s.GreaterThan = function GreaterThan (lowerBound) {
        return s.And(s.Number(), 
                     s.Condition(function GreaterThanCondition (/**number*/ value) { 
                         return lowerBound < value; 
                     }));
    };

    /**
     * @param {number} lowerBound
     * @return {schema}
     */
    s.GreaterThanEqual = function GreaterThanEqual (lowerBound) {
        return s.And(s.Number(), 
                     s.Condition(function GreaterThanEqualCondition (/**number*/value) { 
                         return lowerBound <= value; 
                     }));
    };

    /**
     * @param {number} upperBound
     * @return {schema}
     */
    s.LessThan = function LessThan (upperBound) {
        return s.And(s.Number(), 
                     s.Condition(function LessThanCondition (/**number*/value) { 
                         return value < upperBound; 
                     }));
    };

    /**
     * @param {number} upperBound
     * @return {schema}
     */
    s.LessThanEqual = function LessThanEqual (upperBound) {
        return s.And(s.Number(),
                     s.Condition(function LessThanEqualCondition (/**number*/value) { 
                         return value <= upperBound; 
                     }));
    };

    /**
     * @return {schema}
     */
    s.Integer = function Integer () {
        return s.And(s.Number(), 
                     s.Condition(function IntegerCondition (/**number*/value) { 
                         return value % 1 == 0; 
                     }));
    };

    /**
     * @return {schema}
     */
    s.String = function String () {
        return s.OfType("string");
    };

    /**
     * @return {schema}
     */
    s.Boolean = function Boolean () {
        return s.OfType("boolean");
    };

    /**
     * @param {string|RegExp} re
     * @return {schema}
     */
    s.Test = function Test (re) {
        if (s.typeOf(re) == "string") {
            re = new RegExp(re);
        }
        return s.And(s.String(), 
                     s.Condition(function TestCondition (value) {
                         return re.exec(value) != null; 
                     }));
    };

    /**
     * @param {Array.<*>} values
     * @return {schema}
     */
    s.OneOf = function OneOf (values) {
        var set = { };
        var i;
        for (i = 0; i < values.length; i++) {
            set[values[i]] = true;
        }
        return s.Condition(function OneOfCondition (value) { 
            return set.hasOwnProperty(value);
        });
    };

    /**
     * @param {...*} var_args
     * @return {schema}
     */
    s.Enum = function Enum (var_args) {
        return s.OneOf(copyArray(arguments));
    };

    /**
     * @param {*} value
     * @return {schema}
     */
    s.Constant = function Constant (value) {
        return s.Condition(function ConstantCondition (v) { 
            return v === value; 
        });
    };

    /**
     * @param {{required_properties, optional_properties, allow_other_properties}} spec
     * @return {schema}
     */
    s.Object = function Object (spec) {
        var conditions = [ ];

        var required_properties = spec.required_properties || { };
        forIn(required_properties,
              function (schema, property_name) {
                  conditions.push(function ObjectRequiredProperty (value, p, f) {
                      if (value.hasOwnProperty(property_name)) {
                          schema(value[property_name], p, f);
                      } else {
                          f();
                      }
                  });
              });

        var optional_properties = spec.optional_properties || { };
        forIn(optional_properties,
              function (schema, property_name) {
                  conditions.push(function ObjectOptionalProperty (value, p, f) {
                      if (value.hasOwnProperty(property_name)) {
                          schema(value[property_name], p, f);
                      } else {
                          p();
                      }
                  });
              });

        var allow_other_properties = s.typeOf(spec.allow_other_properties) === "undefined" ? true : spec.allow_other_properties;
        if (! allow_other_properties) {
            conditions.push(s.Condition(function ObjectAllowOtherProperties (value) {
                var value_properties = { };
                forIn(value, function (v, property) { value_properties[property] = true; });
        
                forIn(required_properties, function (v, property) { delete value_properties[property]; });
                forIn(optional_properties, function (v, property) { delete value_properties[property]; });

                return keys(value_properties).length == 0;
            }));
        }                      

        return s.Every(conditions);
    };

    /**
     * Creates a schema for record objects. Records are, a bit like C
     * structs, objects with known, and constant, property names. The
     * optional_properties and allow_other_properties arguments are
     * passed to the Object constructor. Note the different default
     * value, false, for allow_other_properties.
     *
     * @param {Object} required_properties
     * @param {Object|undefined} optional_properties
     * @param {boolean|undefined} allow_other_properties
     * @return {schema}
     */
    s.Record = function Record (required_properties, optional_properties, allow_other_properties) {
        return s.Object({ required_properties: required_properties,
                          optional_properties: optional_properties || { },
                          allow_other_properties: s.typeOf(allow_other_properties) === "undefined" ? false : allow_other_properties });
    };

    s.HashTable = function HashTable () {
        return s.Object({ allow_other_properties: true });
    };

    /**
     * @param {schema} item_schema
     * @param {schema=} length_schema
     * @return {schema}
     */
    s.Array = function Array (item_schema, length_schema) {
        if (arguments.length == 0) {
            throw new Error("Missing required argument item_schema");
        }
        if (s.typeOf(length_schema) == "undefined") {
            length_schema = s.Pass();
        }
        return s.And(s.OfType("array"),
                   function ArrayLength (value, p, f) {
                       length_schema(value.length, p, f);
                   },
                   function ArrayItem (value, p, f) {
                       var loop = function ArrayItemLoop (index) {
                           if (index == value.length) {
                               p();
                           } else {
                               item_schema(value[index],
                                              function ArrayItemLoopNext () {
                                                  loop(index + 1);
                                              },
                                              f);
                           }
                       };
                       loop(0);
                   });
    };

    s.Tuple = function Tuple (items) {
        items = copyArray(arguments);
        return s.And(s.OfType("array"),
                     function Tuple (value, p, f) {
                         if (items.length != value.length) {
                             f("Wrong number f elements in tuple",value,"expected",items.length);
                         } else {
                             var loop = function TupleLoop (index) {
                                 if (value.length == index) {
                                     p();
                                 } else {
                                     items[index](value[index],
                                                  function TupleLoopNext () { loop(index + 1); },
                                                  f);
                                 }
                             };
                             loop(0);
                         };
                     });
    };

    /**
     * Allow the value null, or the parameter schema.
     */
    s.Nullable = function (schema) {
        return s.Or(s.Constant(null), schema);
    };

    s.Pass = function () { 
        return function Pass (value,p,f) { return p(); }; 
    };

    s.Fail = function () { 
        var message = copyArray(arguments); 
        return function Fail (value,p,f) { 
            return f.apply(f, message); 
        }; 
    };

    function copyArray (array) {
        return [].slice.call(array, 0);
    };

    function forIn (o, callback) {
        var value;
        for (value in o) {
            if (o.hasOwnProperty(value)) {
                callback(o[value], value);
            }
        }
    };

    function keys (o) {
        var k = [ ];
        forIn(o, function (value, key) { k.push(key); });
        return k;
    };

    return s;
})();
