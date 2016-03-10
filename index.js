'use strict';

var esprima = require('esprima');
module.exports = parse;

/**
 * Return array of comment objects
 * @param {string}  content
 * @param {Object}  [options]
 * @param {boolean} [options.addEsprimaInfo=false] Add node object which
 *   is generated by Esprima
 * @param {boolean} [options.parseJsDocTags=true]
 * @param {boolean} [options.hideJsDocTags=true] False to remove lines
 *   with jsdoc tags
 * @param {boolean} [options.trim=true] true, false, 'right'
 * @returns {Array<{start, end, lines, jsDoc, tags}>}
 */
function parse(content, options) {
  options = options || {};

  options = defaults(options, {
    addEsprimaInfo: false,
    parseJsDocTags: true,
    hideJsDocTags: true,
    trim: true
  });
  
  var comments = [];
  
  var ast = esprima.parse(content, {
    tolerant: true,
    comment:  true,
    tokens:   true,
    range:    true,
    loc:      true
  }).comments;
  
  for (var i = 0; i < ast.length; i++) {
    var node = ast[i];
    var lines = node.value.replace(/\r\n/g,'\n').split('\n');
    
    var comment = {
      start: node.loc.start.line,
      end: node.loc.end.line
    };
    
    if (options.addEsprimaInfo) {
      comment.node = node;
    }

    comment.jsDoc = !!(lines[0] && lines[0].trim && '*' === lines[0].trim());
    comment.lines = formatLines(lines, comment.jsDoc, options.trim);
    comment.tags  = [];
    
    if (options.parseJsDocTags) {
      applyJsDocTags(comment, options.hideJsDocTags);
      if (options.hideJsDocTags) {
        comment.lines = arrayTrim(comment.lines);
      }
    }
    
    comments.push(comment);
  }
  
  return comments;
}

/**
 * Remove whitespace and comment expressions
 * @param {Array<string>} lines
 * @param {boolean} [jsDoc=true]
 * @param {boolean|string} [trim=true] true, false, 'right'
 * @returns {Array}
 */
function formatLines(lines, jsDoc, trim) {
  jsDoc = undefined === jsDoc || true;
  trim  = undefined === trim  || true;
  lines = lines.slice();
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i] + '';

    if (jsDoc) {
      line = line.replace(/^\s*\*/, '');
    }

    if ('right' === trim) {
      line = line.replace(/\s+$/, '');
    } else if (trim) {
      line = line.trim();
    }

    lines[i] = line;
  }

  lines = arrayTrim(lines);
  
  return lines;
}

/**
 * Find tags in comment, remove this lines and apply as property
 * @param {Object} comment
 * @param {boolean} [removeTagLine=true]
 */
function applyJsDocTags(comment, removeTagLine) {
  removeTagLine = (undefined !== removeTagLine) ? removeTagLine : true;
  var lines = [];
  comment.tags = [];

  for (var i = 0; i < comment.lines.length; i++) {
    var line = comment.lines[i];

    if ('@' === line.charAt(0)) {
      var spacePos = line.indexOf(' ');
      if (-1 === spacePos) {
        spacePos = line.length;
      }
      var tag = line.substr(1, spacePos).trim();
      var value = line.substr(spacePos).trim();
      comment.tags.push({ name: tag, value: value || true });
    } else {
      lines.push(line);
    }
  }

  if (removeTagLine) {
    comment.lines = lines;
  }
}

function arrayTrim(array) {
  array = array instanceof Array ? array : [];
  var l = array.length;
  var i;

  for (i = 0; i < l; i++) {
    if (array[i]) {
      array.splice(0, i);
      break;
    }
  }

  l = array.length;
  for (i = l - 1; i >= 0; i--) {
    if (array[i]) {
      array.length = i + 1;
      break;
    }
  }
  
  return array[0] ? array : [];
}

/**
 * Extend object if a property is not defined yet
 * @param {Object} object
 * @param {Object} options
 * @returns {Object}
 */
function defaults(object, options) {
  object = object || {};
  for (var i in options) {
    if (undefined === object[i] && options.hasOwnProperty(i)) {
      object[i] = options[i];
    }
  }
  return object;
}