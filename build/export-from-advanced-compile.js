/*
 * In order to be able to use the code when its compiled under
 * ADVANCED_OPTIMIZATIONS from code that was compiled either
 * seperately or not compiled at all, we need to make sure to
 * export/publish the internal, and arbitrarily renamed, symbols under
 * the documented names.
 */

jsoSchema = (function (s) {
    return { 'Every': s.Every,
             'And':   s.And,
             'Any':   s.Any,
             'Or':    s.Or,
             'If':    s.If,
             'OfType': s.OfType,
             'Condition': s.Condition,
             'Number': s.Number,
             'Integer': s.Integer,
             'GreaterThan': s.GreaterThan,
             'GreaterThanEqual': s.GreaterThanEqual,
             'LessThan': s.LessThan,
             'LessThanEqual': s.LessThanEqual,
             'String': s.String,
             'Boolean': s.Boolean,
             'Test': s.Test,
             'Enum': s.Enum,
             'OneOf': s.OneOf,
             'Constant': s.Constant,
             'Object': function (spec) {
                 return s.Object({ required_properties: spec['required_properties'],
                                   optional_properties: spec['optional_properties'],
                                   allow_other_properties: spec['allow_other_properties'] });
             },
             'Record': s.Record,
             'HashTable': s.HashTable,
             'Array': s.Array,
             'Tuple': s.Tuple,
             'Nullable': s.Nullable,
             'Pass': s.Pass,
             'Fail': s.Fail,
             'violatesSchema': function (value, schema) {
                 var ret = s.violatesSchema(value, schema);
                 return ret == false ? false : { 'value': ret.value, 'schema': ret.schema, 'message': ret.message };
             },
             'validate': s.validate
           };
})(jsoSchema);
