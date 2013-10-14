/*
 * In order to be able to use the code when its compiled under
 * ADVANCED_OPTIMIZATIONS from code that was compiled either
 * seperately or not compiled at all, we need to make sure to
 * export/publish the internal, and arbitrarily renamed, symbols under
 * the documented names.
 */

jsoSchema = { 'Every': jsoSchema.Every,
              'And':   jsoSchema.And,
              'Any':   jsoSchema.Any,
              'Or':    jsoSchema.Or,
              'If':    jsoSchema.If,
              'OfType': jsoSchema.OfType,
              'Condition': jsoSchema.Condition,
              'Number': jsoSchema.Number,
              'Integer': jsoSchema.Integer,
              'GreaterThan': jsoSchema.GreaterThan,
              'GreaterThanEqual': jsoSchema.GreaterThanEqual,
              'LessThan': jsoSchema.LessThan,
              'LessThanEqual': jsoSchema.LessThanEqual,
              'String': jsoSchema.String,
              'Boolean': jsoSchema.Boolean,
              'Test': jsoSchema.Test,
              'Enum': jsoSchema.Enum,
              'OneOf': jsoSchema.OneOf,
              'Constant': jsoSchema.Constant,
              'Object': function (spec) {
                  return jsoSchema.Object({ required_properties: spec['required_properties'],
                                            optional_properties: spec['optional_properties'],
                                            allow_other_properties: spec['allow_other_properties'] });
              },
              'Record': jsoSchema.Record,
              'HashTable': jsoSchema.HashTable,
              'Array': jsoSchema.Array,
              'Tuple': jsoSchema.Tuple,
              'Nullable': jsoSchema.Nullable,
              'Pass': jsoSchema.Pass,
              'Fail': jsoSchema.Fail,
              'violatesSchema': function (value, schema) {
                  var ret = jsoSchema.violatesSchema(value, schema);
                  return ret == false ? false : { 'value': ret.value, 'schema': ret.schema, 'message': ret.message };
              },
              'validate': jsoSchema.validate
            };
