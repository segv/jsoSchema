/*global module */

module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-mocha-test');

  var config = {
    mochaTest: {
      test: {
        options: { ui: 'qunit',
                   reporter: 'tap' },
        src: [ 'test/**/*.js' ]
      }
    }
  };

  grunt.initConfig(config);

  grunt.registerTask('default', [ 'mochaTest' ]);
};
