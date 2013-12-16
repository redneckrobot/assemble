/**
 * Data Utils
 */

// Node.js
var path = require('path');
var fs = require('fs');

var traverse = require('traverse');
var _ = require('lodash');

var DB = require('../db');

var generateFilename = function(name) {
  return path.join(process.cwd(), '.assemble', 'data', name);
};

// The module to be exported.
var data = module.exports = {};

data.loadDatastore = function(name) {
  var filename = generateFilename(name);
  return new DB({filename: filename});
};

data.destroyDatastore = function(name, done) {
  if(!done) {
    done = function() {};
  }
  
  var filename = generateFilename(name);
  fs.exists(filename, function(exists) {
    if(exists) {
      fs.unlink(filename, function(err) {
        done();
      });
    } else {
      done();
    }
  });
};

// following regex is from grunt.config template processing
var tmplRegex = /^<%=\s*([a-z0-9_$]+(?:\.[a-z0-9_$]+)*)\s*%>$/i;

// allow for calls to functions to add their value into the tree
var fnTmplRegex = /^<%(?:=?)\s*(([a-z0-9_$]+(?:\.[a-z0-9_$]+)*)\s*(\(\s*([^\)]*)\)))\s*%>$/i;

/**
 * Recursively process lodash templates if values
 * @param  {Object} obj - object with possible values that need processing
 * @return {Object}     - returns a new object with processed values
 */
data.process = function(obj) {
  return traverse(obj).map(function(o) {
    var matches = false;
    // if the value is a string, check for template patterns
    if(typeof o === 'string') {
      // if this is a normal template '<%= foo %>' or '<%= foo.baz %>'
      if(matches = o.match(tmplRegex)) {
        // get the value and update it in the tree
        this.update(data.get(obj, matches[1]));
      // otherwise, if this is a template calling a function '<%= foo() %>'
      } else if (matches = o.match(fnTmplRegex)) {
        // this code is inspired by the internal lodash template engine.
        // this creates a new function taking in parameters for the
        // context (our object) and lodash so we can execute normally.
        var fnBody = 'with(ctx) { return ' + matches[1] + '; }';
        var result = Function(['ctx', '_'], fnBody).apply(undefined, [obj, _]); // jshint ignore:line
        this.update(result);
      } else {
        // process any other strings like a normal lodash template
        this.update(_.template(o, obj));
      }
    }
  });
};

data.get = function(obj, path) {
  return traverse(obj).get(path.split('.'));
};

data.set = function(obj, path, value) {
  return traverse(obj).set(path.split('.'), value);
};