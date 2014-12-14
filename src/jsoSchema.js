/*
 * Copyright 2013 Edward Marco Baringer
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you
 * may not use this file except in compliance with the License. You
 * may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
 * implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
/*global module */

module.exports = (function () {
  'use strict';

  var s = { };

  function forIn (o, callback) {
    var value;
    for (value in o) {
      if (o.hasOwnProperty(value)) {
        callback(o[value], value);
      }
    }
  };

  function merge () {
    var o = arguments[0];
    for (var i = 1; i < arguments.length; i++) {
      for (var k in arguments[i]) {
        o[k] = arguments[i][k];
      }
    }
    return o;
  };

  function keys (o) {
    var k = [ ];
    forIn(o, function (value, key) { k.push(key); });
    return k;
  };

  function shallow_clone (o) {
    var o2 = { };
    forIn(o, function (value, key) { o2[key] = value; });
    return o2;
  };

  function map (array, callback) {
    var a = [ ], i;
    for (i = 0; i < array.length; i++) {
      a.push(callback(array[i]));
    }
    return a;
  };

  function copyArray (array) {
    return map(array, function (x) { return x; });
  };

  function extend(base, sub) {
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var origProto = sub.prototype;
    sub.prototype = Object.create(base.prototype);
    for (var key in origProto)  {
      sub.prototype[key] = origProto[key];
    }
    sub.prototype.constructor = sub;
    Object.defineProperty(sub.prototype, 'constructor', {
      enumerable: false,
      value: sub
    });
  }

  /**
   * @constructor
   */
  function Schema () {
    this._doc = null;
    this._label = null;
  };

  s.Schema = function () { return new Schema(); };

  Schema.prototype.label = function (new_label) {
    if (arguments.length == 0) {
      return this._label;
    } else {
      this._label = arguments[0];
      return this;
    }
  };

  Schema.prototype.doc = function (new_label) {
    if (arguments.length == 0) {
      return this._doc;
    } else {
      this._doc = arguments[0];
      return this;
    }
  };

  /** Tests if value is valid according to the constraints in this.
   *
   * returns an object with a match property which will be true if the
   * value meets the constraints and false otherwise. if value
   * satisfies the constraints of this. Otherwise returns an object
   * describing the failure. */
  Schema.prototype.test = function (value) {
    return this.exec(value,
                     function (trace) { return { match: true, trace: trace }; },
                     function (trace) { return { match: false, trace: trace }; },
                     [ ] );
  };

  /**
   * @param {Array<*>} trace
   * @param {number=} depth
   */
  function traceToLines(trace, depth) {
    depth = depth || 0;
    var steps = [ ];
    map(trace, function (step) {
      steps.push([ depth, step.match, step.schema, step.value ]);
      if (step.inner_trace) {
        steps = steps.concat(traceToLines(step.inner_trace, depth + 2));
      }
    });
    return steps;
  };

  s.formatTrace = function(trace) {
    var text = '';
    map(traceToLines(trace), function (line) {
      text += Array(line[0] + 1).join(' ');
      text += (line[1] ? 'pass' : 'FAIL') + '/';
      text += line[2].label() + '/';
      text += JSON.stringify(line[3]) + '/\n';
    });
    return text;
  };

  /**
   * @constructor
   * @extends {Schema}
   */
  function Condition (condition) {
    Schema.apply(this, arguments);
    this.condition = condition;
    this.label('unlabeled condition schema');
  };
  extend(Schema, Condition);

  s.Condition = function (condition) { return new Condition(condition); };

  Condition.prototype.exec = function (value, p, f, trace) {
    if (this.condition(value)) {
      return p(trace.concat({ schema: this, value: value, match: true }));
    } else {
      return f(trace.concat({ schema: this, value: value, match: false }));
    }
  };

  /**
   * @constructor
   * @extends {Schema}
   */
  function Every (conditions) {
    Schema.apply(this, arguments);
    this.conditions = conditions;
    this.label('unlabeled every schema');
  };
  extend(Schema, Every);

  /**
   * @param {Array<Schema>} conditions
   */
  s.Every = function (conditions) { return new Every(conditions); };

  /**
   * @param {...Schema} schemas
   */
  s.And = function (schemas) { return new Every(copyArray(arguments)); };

  Every.prototype.exec = function (value, p, f, outer_trace) {
    var self = this;

    var loop = function (index, inner_trace) {
      if (index == self.conditions.length) {
        return p(outer_trace.concat({ match: true,
                                      schema: self,
                                      value: value,
                                      inner_trace: inner_trace }));
      } else {
        return self.conditions[index].exec(value,
                                           function(trace) {
                                             return loop(index + 1, inner_trace.concat(trace));
                                           },
                                           function(trace) {
                                             return f(outer_trace.concat({ match: false,
                                                                           schema: self,
                                                                           value: value,
                                                                           inner_trace: inner_trace.concat(trace) }));
                                           },
                                           [ ]);
      }
    };
    return loop(0, [ ]);
  };

  /**
   * @constructor
   * @extends {Schema}
   */
  function Any (conditions) {
    Schema.apply(this, arguments);
    this.conditions = conditions;
    this.label('unlabeled any schema');
  };
  extend(Schema, Any);

  /**
   * @param {Array<Schema>} conditions
   */
  s.Any = function (conditions) { return new Any(conditions); };

  /**
   * @param {...Schema} schemas
   */
  s.Or  = function (schemas) { return new Any(copyArray(arguments)); };

  Any.prototype.exec = function (value, p, f, outer_trace) {
    var self = this;

    var loop = function (index, inner_trace) {
      if (index == self.conditions.length) {
        return f(outer_trace.concat({ match: false,
                                      schema: self,
                                      value: value,
                                      inner_trace: inner_trace }));
      } else {
        return self.conditions[index].exec(value,
                                           function(trace) {
                                             return p(outer_trace.concat({ match: true,
                                                                           schema: self,
                                                                           value: value,
                                                                           inner_trace: inner_trace.concat(trace) }));
                                           },
                                           function(trace) {
                                             return loop(index + 1, inner_trace.concat(trace));
                                           },
                                           [ ]);
      }
    };
    return loop(0, [ ]);
  };

  /**
   * @constructor
   * @extends {Schema}
   */
  // call this ArraySchema so we do't conflict with the global Array object
  function ArraySchema (item_schema, length_schema) {
    Schema.apply(this, arguments);
    this.item_schema = item_schema;
    this.typeCheck = s.OfType('array');
    this.label('unlabeled array schema');
    if (length_schema) {
      this.length_schema = length_schema;
    } else {
      this.length_schema = s.Pass();
      this.length_schema.label('auto generated length schema');

    }
  }
  extend(Schema, ArraySchema);

  ArraySchema.prototype.exec = function (value, p, f, outer_trace) {
    var self = this;

    var fail = function (inner_trace) {
      return f(outer_trace.concat({ match: false,
                                    schema: self,
                                    value: value,
                                    inner_trace: inner_trace }));
    };

    var loop = function (index, inner_trace) {
      if (index == value.length) {
        return p(outer_trace.concat({ match: true,
                                      schema: self,
                                      value: value,
                                      inner_trace: inner_trace }));
      } else {
        return self.item_schema.exec(value[index],
                                     function(trace) {
                                       return loop(index + 1, inner_trace.concat(trace));
                                     },
                                     function (trace) {
                                       return fail(inner_trace.concat(trace));
                                     },
                                     [ ]);
      }
    };

    return self.typeCheck.exec(value,
                               function (type_trace) {
                                 return self.length_schema.exec(value.length,
                                                                function (trace) { return loop(0, type_trace.concat(trace)); },
                                                                function (trace) { return fail(type_trace.concat(trace)); },
                                                                [ ]);
                               },
                               function (type_trace) {
                                 return fail(type_trace);
                               },
                               [ ]);
  };

  s.Array = function (item_schema, length_schema) {
    return new ArraySchema(item_schema, length_schema);
  };

  s.Object = function (spec) {
    var self = this;

    spec = merge({ required_properties: { },
                   optional_properties: { },
                   allow_other_properties: true,
                   own_properties: true },
                 spec);

    self.required_properties    = spec.required_properties;
    self.optional_properties    = spec.optional_properties;
    self.allow_other_properties = spec.allow_other_properties;
    self.own_properties         = spec.own_properties;

    var property_exists = function (object, property_name) {
      if (self.own_properties) {
        return object.hasOwnProperty(property_name);
      } else {
        return property_name in object;
      }
    };

    var defined_properties = { };
    var conditions = [ s.OfType('object') ];

    forIn(this.required_properties, function (schema, property) {
      defined_properties[property] = schema;
      conditions.push(s.And(s.Condition(function (object) { return property_exists(object, property); }).label('property ' + property + ' exists'),
                            schema)
                      .label('required property ' + property));
    });

    forIn(this.optional_properties, function (schema, property) {
      if (defined_properties[property]) {
        throw new Error('Property ' + property + ' defined both as required and optional');
      }
      defined_properties[property] = schema;
      conditions.push(s.If(s.Condition(function (object) { return object.hasOwnProperty(property); }).label('property ' + property + ' exists'),
                           schema,
                           s.Pass().label('optional property not present'))
                      .label('optoinal property ' + property));
    });

    if (! self.allow_other_properties) {
      conditions.push(s.Condition(function (object) {
        var allowed = shallow_clone(defined_properties);
        for (var k in object) {
          if (self.own_properties) {
            if (object.hasOwnProperty(k)) {
              delete allowed[k];
            }
          } else {
            delete allowed[k];
          }
        }
        return keys(allowed).length == 0;
      }));
    }

    return s.Every(conditions).label('unlabeled object schema');
  };

  s.Record = function(required, optional) {
    return s.Object({ required_properties: required,
                      optional_properties: arguments.length == 2 ? optional : { },
                      allow_other_properties: false,
                      own_properties: true }).label('a record object');

  };

  s.If = function (condition, then, els) {
    return s.Or(s.And(condition,
                      then).label('If: condition -> then'),
                els).label('If: not condition -> else');
  };

  s.Constant = function (constant) {
    var c = new Condition(function (value) {
      return value === constant;
    });
    c.label('the constant value ' + JSON.stringify(constant));
    return c;
  };

  s.OfType = function (typeName) {
    return s.Condition(function (value) {
      if (typeName == 'array') {
        return Array.isArray(value);
      } else {
        return typeof(value) == typeName;
      }
    }).label('a value of type ' + typeName);
  };

  s.Number = function () {
    return s.OfType('number');
  };

  s.GreaterThan = function (minimum) {
    return s.And(s.Number(),
                 s.Condition(function (value) { return value > minimum; }).label('value > ' + minimum) ).label('a number greater than ' + minimum);
  };

  s.LessThan = function (maximum) {
    return s.And(s.Number(),
                 s.Condition(function (value) { return value < maximum; }).label('value < ' + maximum) ).label('a number less than ' + maximum);
  };

  s.Integer = function () {
    return s.And(s.OfType('number'),
                 s.Condition(function (value) { return value % 1 == 0; }).label('mod 1 check')).label('an integer');
  };

  s.String = function () {
    return s.OfType('string');
  };

  s.Nullable = function (schema) {
    var nullable = s.Or(s.Constant(null), schema);
    nullable.label = function () {
      if (arguments.length == 0) {
        if (this._label) {
          return this._label;
        } else {
          return 'a nullable ' + schema.label();
        }
      } else {
        this._label = arguments[0];
        return this._label;
      }
    };
    return nullable;
  };

  s.Pass = function () {
    return s.Condition(function () { return true; }).label('always pass');
  };

  s.Fail = function () {
    return s.Condition(function () { return false; }).label('always fail');
  };

  s.DontCare = function () {
    return s.Condition(function () { return true; }).label('any value');
  };

  s.RegExp = function (regexp) {
    return s.And(s.String(),
                 s.Condition(function (value) { return regexp.test(value); }).label('regexp.test'))
      .label('regexp test ' + regexp);
  };

  return s;

})();
