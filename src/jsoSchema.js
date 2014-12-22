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
/*global module, define */

(function (exporter) {
  'use strict';

  var s = { };

  /**
   * Calls callback on each property, as per hasOwnProperty, of
   * object.
   * @param {object} object an object
   * @param {function(object,object)} callback a function. will be passed (property_name,
   * property_value) */
  function forIn (object, callback) {
    var property;
    for (property in object) {
      if (object.hasOwnProperty(property)) {
        callback(object[property], property);
      }
    }
  };

  /**
   * Shim for Object.assign.
   * @param {...objects} objects this list of objects to be
   * merged. The first object will be destructively
   * modified. Properties will be applid from left to right (so the
   * rightmost value is the value that will be visible when assign
   * returns.
   * @return {object} the first argument */
  function assign (objects) {
    var o = arguments[0];
    for (var i = 1; i < arguments.length; i++) {
      for (var k in arguments[i]) {
        o[k] = arguments[i][k];
      }
    }
    return o;
  };

  /**
   * returns the object's keys as an array */
  function keys (o) {
    var k = [ ];
    forIn(o, function (value, key) { k.push(key); });
    return k;
  };

  /**
   * creates a new object with the same (as per ===) keys and values
   * as o */
  function shallow_clone (o) {
    var o2 = { };
    forIn(o, function (value, key) { o2[key] = value; });
    return o2;
  };

  /**
   * returns a fresh array containg the result of calling callback on
   * each element of array */
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

  function Schema () {
    this._doc = null;
    this._label = null;
  };

  s.Schema = function () { return new Schema(); };

  function accessor (property_name) {
    return function (new_value) {
      if (arguments.length == 0) {
        return this[property_name];
      } else {
        this[property_name] = arguments[0];
        return this;
      }
    };
  }

  Schema.prototype.label = accessor('_label');
  Schema.prototype.doc = accessor('_doc');
  Schema.prototype.tag = accessor('_tag');

  function Match (match, trace) {
    this.match = match;
    this.trace = trace;
    this._backtrace = null;
  }

  function traceToLines(trace, depth) {
    depth = depth || 0;
    var steps = [ ];
    map(trace, function (step) {
      steps.push({ depth: depth,
                   match: step.match,
                   schema: step.schema,
                   value: step.value });
      if (step.inner_trace) {
        steps = steps.concat(traceToLines(step.inner_trace, depth + 2));
      }
    });
    return steps;
  };

  s.formatTrace = function(trace) {
    var lines = traceToLines(trace);
    var last_value = lines[0].value;
    var text = 'value:' + JSON.stringify(last_value) + '\n';
    map(traceToLines(trace), function (frame) {
      text += Array(frame.depth + 1).join(' ');
      if (frame.value !== last_value) {
        last_value = frame.value;
        text += 'v:' + JSON.stringify(last_value);
        text += '\n';
      }
      text += (frame.match ? '' : 'FAIL');
      var tag = frame.schema.tag();
      var label = frame.schema.label();
      text += '/s.' + tag + '/' + (label !== null ? label : '');
      text += '\n';
    });
    return text;
  };

  Match.prototype.backtrace = function () {
    if (this._backtrace == null) {
      this._backtrace = s.formatTrace(this.trace);
    }
    return this._backtrace;
  };

  /** Tests if value is valid according to the constraints in this.
   *
   * returns an object with a match property which will be true if the
   * value meets the constraints and false otherwise. if value
   * satisfies the constraints of this. Otherwise returns an object
   * describing the failure.
   */
  Schema.prototype.test = function (value) {
    return this.exec(value,
                     function (trace) { return new Match(true, trace); },
                     function (trace) { return new Match(false, trace); },
                     [ ] );
  };

  function Condition (condition) {
    Schema.apply(this, arguments);
    this.condition = condition;
    this.tag('Condition');
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

  function Every (conditions) {
    Schema.apply(this, arguments);
    this.conditions = conditions;
  };
  extend(Schema, Every);

  s.Every = function (conditions) { return new Every(conditions).tag('Every'); };

  s.And = function (schemas) { return new Every(copyArray(arguments)).tag('And'); };

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

  function Any (conditions) {
    Schema.apply(this, arguments);
    this.conditions = conditions;
    this.label('unlabeled any schema');
  };
  extend(Schema, Any);

  s.Any = function (conditions) { return new Any(conditions).tag('Any'); };

  s.Or  = function (schemas) { return new Any(copyArray(arguments)).tag('Or'); };

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
    return new ArraySchema(item_schema, length_schema).tag('Array');
  };

  s.Object = function (spec) {
    var self = this;

    spec = assign({ required_properties: { },
                    optional_properties: { },
                    without_properties: [ ],
                    allow_other_properties: true,
                    own_properties: true },
                  spec);

    self.required_properties    = spec.required_properties;
    self.optional_properties    = spec.optional_properties;
    self.without_properties     = spec.without_properties;
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
      conditions.push(s.Condition(function (object) { return property_exists(object, property); }).label('property ' + property + ' exists'));

      var required = s.Schema().label('required property ' + property);
      required.exec = function (value, p, f, trace) {
        return schema.exec(value[property], p, f, trace);
      };

      conditions.push(required);
    });

    forIn(this.optional_properties, function (schema, property) {
      if (defined_properties[property]) {
        throw new Error('Property ' + property + ' defined both as required and optional');
      }
      defined_properties[property] = schema;

      var optional = s.Schema().label('optional property ' + property);

      optional.exec = function(value, p, f, trace) {
        if (property_exists(value, property)) {
          return schema.exec(value[property], p, f, trace.concat({ schema: optional, value: value, match: true }));
        } else {
          return p(trace.concat({ schema: optional, value: value, match: true }));
        }
      };

      conditions.push(optional);
    });

    map(self.without_properties, function (property_name) {
      conditions.push(s.Condition(function (object) {
        return ! property_exists(object, property_name);
      }).label('without property ' + property_name));
    });

    if (! self.allow_other_properties) {
      conditions.push(s.Condition(function (object) {
        var object_properties = shallow_clone(object);
        for (var k in defined_properties) {
          delete object_properties[k];
        }
        return keys(object_properties).length == 0;
      }).label('no other properties'));
    }

    return s.Every(conditions).tag('Object');
  };

  s.Record = function(required, optional) {
    return s.Object({ required_properties: required,
                      optional_properties: arguments.length == 2 ? optional : { },
                      allow_other_properties: false,
                      own_properties: true }).label('a record object')
      .tag('Record');
  };

  s.If = function (condition, then, els) {
    return s.Or(s.And(condition,
                      then),
                els)
      .tag('If');
  };

  s.Constant = function (constant) {
    var c = new Condition(function (value) {
      return value === constant;
    });
    c.label('the constant value ' + JSON.stringify(constant));
    c.tag('Constant');
    return c;
  };

  s.Enum = function (values) {
    return s.Every(map(arguments, function (value) { return s.Constant(value); }));
  };

  s.OfType = function (typeName) {
    return s.Condition(function (value) {
      if (typeName == 'array') {
        return Array.isArray(value);
      } else {
        return typeof(value) == typeName;
      }
    }).label('a value of type ' + typeName).tag('OfType');
  };

  s.Number = function () {
    return s.OfType('number').tag('Number');
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
                 s.Condition(function (value) { return value % 1 == 0; }).label('mod 1 check')).tag('Integer');
  };

  s.String = function () {
    return s.OfType('string').tag('String');
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
    return nullable.tag('Nullable');
  };

  s.Pass = function () {
    return s.Condition(function () { return true; }).tag('Pass');
  };

  s.Fail = function () {
    return s.Condition(function () { return false; }).tag('Fail');
  };

  s.DontCare = function () {
    return s.Condition(function () { return true; }).tag('DontCare');
  };

  s.RegExp = function (regexp) {
    return s.And(s.String(),
                 s.Condition(function (value) { return regexp.test(value); }).tag('RegExp'))
      .label('regexp test ' + regexp);
  };

  s.Boolean = function () {
    return s.OfType('boolean').tag('Boolean');
  };

  return exporter(s);

})(function (object) {
  if (typeof(module) !== 'undefined') {
    return module.exports = object;
  } else if (typeof(define) !== 'undefined') {
    return define(object);
  } else {
    return this.jsoSchema = object;
  }
});
