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

    /**
     * Return true if @param{schema} accepts @param{value}
     *
     * @param {*} value
     * @param {schema} schema
     * @return boolean
     */
    function validate (value, schema) {
        return violatesSchema(value, schema) == false ? true : false;
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
    function violatesSchema (value, schema) {
        var error = undefined;
        var ok = false;
        schema(value,
               function () { ok = true; },
               function () { error = { 'value': value, 'schema': schema, 'message': [].concat(arguments) }; });

        return ok ? false : error;
    };

    /**
     * Short circuiting and.
     *
     * @param {...schema} conditions
     * @return {schema}
     */
    function And (conditions) {
        return Every(copyArray(arguments));
    };

    /**
     * Short circuiting and.
     *
     * @param {Array.<schema>} conditions
     * @return {schema}
     */
    function Every (conditions) {
        return function (value, p, f) {
            var loop = function (index) {
                if (index == conditions.length) {
                    p();
                } else {
                    conditions[index](value,
                                      function () { loop(index + 1); },
                                      f);
                }
            };
            loop(0);
        };
    };

    /**
     * 2 argument Any
     *
     * @param {...schema} conditions
     * @return {schema}
     */
    function Or (conditions) {
        return Any(copyArray(arguments)); 
    };

    /**
     * Short circuiting or
     *
     * @param {Array.<schema>} conditions
     * @return {schema}
     */
    function Any (conditions) {
        return function (value, p, f) {
            var loop = function (index) {
                if (index == conditions.length) {
                    f();
                } else {
                    conditions[index](value,
                                      p,
                                      function () { loop(1 + index); });
                }
            };
            loop(0);
        };
    };

    function If (condition, then, els) {
        return Or(And(condition, then), els);
    };

    /** 
     * Helper function for simple tests
     * @param {function(*):boolean} valueCheck
     * @return {schema}
     */
    function Condition (valueCheck) {
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
     * @return {schema}
     */
    function OfType (typeName) {
        return Condition(function (value) { return typeOf(value) == typeName; });
    };

    /**
     * @return {schema}
     */
    function Number () {
        return OfType("number");
    };

    /**
     * @param {number} lowerBound
     * @return {schema}
     */
    function GreaterThan (lowerBound) {
        return And(Number(), Condition(function (/**number*/ value) { return lowerBound < value; }));
    };

    /**
     * @param {number} lowerBound
     * @return {schema}
     */
    function GreaterThanEqual (lowerBound) {
        return And(Number(), Condition(function (/**number*/value) { return lowerBound <= value; }));
    };

    /**
     * @param {number} upperBound
     * @return {schema}
     */
    function LessThan (upperBound) {
        return And(Number(), Condition(function (/**number*/value) { return value < upperBound; }));
    };

    /**
     * @param {number} upperBound
     * @return {schema}
     */
    function LessThanEqual (upperBound) {
        return And(Number(), Condition(function (/**number*/value) { return value <= upperBound; }));
    };

    /**
     * @return {schema}
     */
    function Integer () {
        return And(Number(), Condition(function (/**number*/value) { return value % 1 == 0; }));
    };

    /**
     * @return {schema}
     */
    function String () {
        return OfType("string");
    };

    /**
     * @return {schema}
     */
    function Boolean () {
        return OfType("boolean");
    };

    /**
     * @param {string|RegExp} re
     * @return {schema}
     */
    function Test (re) {
        if (typeOf(re) == "string") {
            re = new RegExp(re);
        }
        return And(String(), Condition(function (value) { return re.exec(value) != null; }));
    };

    /**
     * @param {Array.<*>} values
     * @return {schema}
     */
    function OneOf (values) {
        var set = { };
        var i;
        for (i = 0; i < values.length; i++) {
            set[values[i]] = true;
        }
        return Condition(function (value) { return set.hasOwnProperty(value); });
    };

    /**
     * @param {...*} var_args
     * @return {schema}
     */
    function Enum (var_args) {
        return OneOf(copyArray(arguments));
    };

    /**
     * @param {*} value
     * @return {schema}
     */
    function Constant (value) {
        return Condition(function (v) { return v === value; });
    };

    function Object (spec) {
        var conditions = [ ];

        var required_properties = spec.required_properties || { };
        forIn(required_properties,
              function (schema, property_name) {
                  conditions.push(function (value, p, f) {
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
                  conditions.push(function (value, p, f) {
                      if (value.hasOwnProperty(property_name)) {
                          schema(value[property_name], p, f);
                      } else {
                          p();
                      }
                  });
              });

        var allow_other_properties = typeOf(spec.allow_other_properties) === "undefined" ? true : spec.allow_other_properties;
        if (! allow_other_properties) {
            conditions.push(Condition(function (value) {
                var value_properties = { };
                forIn(value, function (v, property) { value_properties[property] = true; });
        
                forIn(required_properties, function (v, property) { delete value_properties[property]; });
                forIn(optional_properties, function (v, property) { delete value_properties[property]; });

                return keys(value_properties).length == 0;
            }));
        }                      

        return Every(conditions);
    };

    function Record (required_properties) {
        return Object({ required_properties: required_properties, 
                        allow_other_properties: false });
    };

    function HashTable () {
        return Object({ allow_other_properties: true });
    };

    /**
     * @param {schema} item_schema
     * @param {schema=} length_schema
     * @return {schema}
     */
    function Array (item_schema, length_schema) {
        if (arguments.length == 0) {
            throw new Error("Missing required argument item_schema");
        }
        if (typeOf(length_schema) == "undefined") {
            length_schema = Pass();
        }
        return And(OfType("array"),
                   function (value, p, f) {
                       length_schema(value.length, p, f);
                   },
                   function (value, p, f) {
                       var loop = function (index) {
                           if (index == value.length) {
                               p();
                           } else {
                               item_schema(value[index],
                                              function () {
                                                  loop(index + 1);
                                              },
                                              f);
                           }
                       };
                       loop(0);
                   });
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

    function Nullable (schema) {
        return Or(Constant(null), schema);
    };

    function Pass () { 
        return function (value,p,f) { return p(); }; 
    };

    function Fail () { 
        var message = copyArray(arguments); 
        return function (value,p,f) { 
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
             'Object': function (spec) {
                 return Object({ required_properties: spec['required_properties'],
                                 optional_properties: spec['optional_properties'],
                                 allow_other_properties: spec['allow_other_properties'] });
             },
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
