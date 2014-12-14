/*global module */

module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-closure-tools');
  grunt.loadNpmTasks('grunt-mocha-test');

  var config = {
    closureCompiler: {
      options: {
        compilerFile: 'build/compiler.jar',
        checkModified: true,
        compilerOpts: {
          compilation_level: 'SIMPLE',
          language_in: 'ECMASCRIPT5_STRICT',
          warning_level: 'verbose',
          externs: [ 'src/externs.js' ]
        }
      },
      jsoSchema: {
        src: 'src/jsoSchema.js',
        dest: 'build/jsoSchema.min.js'
      }
    },
    mochaTest: {
      test: {
        options: { ui: 'qunit',
                   reporter: 'tap' },
        src: [ 'test/**/*.js' ]
      }
    }
  };

  grunt.initConfig(config);

  grunt.registerTask('default', [ 'closureCompiler', 'mochaTest' ]);
};
