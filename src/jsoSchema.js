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
    s.validate = function (value, schema) {
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
    s.violatesSchema = function (value, schema) {
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
    s.And = function (conditions) {
        return s.Every(s.copyArray(arguments));
    };

    /**
     * Short circuiting and.
     *
     * @param {Array.<schema>} conditions
     * @return {schema}
     */
    s.Every = function (conditions) {
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
    s.Or = function (conditions) {
        return s.Any(s.copyArray(arguments)); 
    };

    /**
     * Short circuiting or
     *
     * @param {Array.<schema>} conditions
     * @return {schema}
     */
    s.Any = function (conditions) {
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

    s.If = function (condition, then, els) {
        return s.Or(s.And(condition, then), els);
    };

    /** 
     * Helper function for simple tests
     * @param {function(*):boolean} valueCheck
     * @return {schema}
     */
    s.Condition = function (valueCheck) {
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
    s.typeOf = function(value) {
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
    s.OfType = function (typeName) {
        return s.Condition(function (value) { return s.typeOf(value) == typeName; });
    };

    /**
     * @return {schema}
     */
    s.Number = function () {
        return s.OfType("number");
    };

    /**
     * @param {number} lowerBound
     * @return {schema}
     */
    s.GreaterThan = function (lowerBound) {
        return s.And(s.Number(), s.Condition(function (/**number*/ value) { return lowerBound < value; }));
    };

    /**
     * @param {number} lowerBound
     * @return {schema}
     */
    s.GreaterThanEqual = function (lowerBound) {
        return s.And(s.Number(), s.Condition(function (/**number*/value) { return lowerBound <= value; }));
    };

    /**
     * @param {number} upperBound
     * @return {schema}
     */
    s.LessThan = function (upperBound) {
        return s.And(s.Number(), s.Condition(function (/**number*/value) { return value < upperBound; }));
    };

    /**
     * @param {number} upperBound
     * @return {schema}
     */
    s.LessThanEqual = function (upperBound) {
        return s.And(s.Number(), s.Condition(function (/**number*/value) { return value <= upperBound; }));
    };

    /**
     * @return {schema}
     */
    s.Integer = function () {
        return s.And(s.Number(), s.Condition(function (/**number*/value) { return value % 1 == 0; }));
    };

    /**
     * @return {schema}
     */
    s.String = function () {
        return s.OfType("string");
    };

    /**
     * @return {schema}
     */
    s.Boolean = function () {
        return s.OfType("boolean");
    };

    /**
     * @param {string|RegExp} re
     * @return {schema}
     */
    s.Test = function (re) {
        if (s.typeOf(re) == "string") {
            re = new RegExp(re);
        }
        return s.And(s.String(), s.Condition(function (value) { return re.exec(value) != null; }));
    };

    /**
     * @param {Array.<*>} values
     * @return {schema}
     */
    s.OneOf = function (values) {
        var set = { };
        var i;
        for (i = 0; i < values.length; i++) {
            set[values[i]] = true;
        }
        return s.Condition(function (value) { return set.hasOwnProperty(value); });
    };

    /**
     * @param {...*} var_args
     * @return {schema}
     */
    s.Enum = function (var_args) {
        return s.OneOf(s.copyArray(arguments));
    };

    /**
     * @param {*} value
     * @return {schema}
     */
    s.Constant = function (value) {
        return s.Condition(function (v) { return v === value; });
    };

    s.Object = function (spec) {
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

        var allow_other_properties = s.typeOf(spec.allow_other_properties) === "undefined" ? true : spec.allow_other_properties;
        if (! allow_other_properties) {
            conditions.push(s.Condition(function (value) {
                var value_properties = { };
                forIn(value, function (v, property) { value_properties[property] = true; });
        
                forIn(required_properties, function (v, property) { delete value_properties[property]; });
                forIn(optional_properties, function (v, property) { delete value_properties[property]; });

                return keys(value_properties).length == 0;
            }));
        }                      

        return s.Every(conditions);
    };

    s.Record = function (required_properties) {
        return Object({ required_properties: required_properties, 
                        allow_other_properties: false });
    };

    s.HashTable = function () {
        return Object({ allow_other_properties: true });
    };

    /**
     * @param {schema} item_schema
     * @param {schema=} length_schema
     * @return {schema}
     */
    s.Array = function (item_schema, length_schema) {
        if (arguments.length == 0) {
            throw new Error("Missing required argument item_schema");
        }
        if (s.typeOf(length_schema) == "undefined") {
            length_schema = s.Pass();
        }
        return s.And(s.OfType("array"),
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

    s.Tuple = function (items) {
        items = s.copyArray(arguments);
        return s.And(s.OfType("array"),
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

    s.Nullable = function (schema) {
        return s.Or(s.Constant(null), schema);
    };

    s.Pass = function () { 
        return function (value,p,f) { return p(); }; 
    };

    s.Fail = function () { 
        var message = s.copyArray(arguments); 
        return function (value,p,f) { 
            return f.apply(f, message); 
        }; 
    };

    s.copyArray = function (array) {
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
