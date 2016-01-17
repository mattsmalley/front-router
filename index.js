var through     = require('through2');
var fm          = require('front-matter');
var PluginError = require('gulp-util').PluginError;
var path        = require('path');
var fs          = require('fs');
var mkdirp      = require('mkdirp');

module.exports = function(options) {
  var configs = [];
  var directory = options.dir || process.cwd();

  function bufferContents(file, enc, cb) {
    var config;
    var content;

    if (file.isNull()) {
      return cb(null, file);
    }

    if (file.isStream()) {
      return cb(new PluginError('gulp-front-router', 'Streams not supported.'));
    }

    if (file.isBuffer()) {
      try {
        content = fm(String(file.contents));
      }
      catch (e) {
        return cb(new PluginError('gulp-front-router', e));
      }

      if (content.attributes.name) {
        file.contents = new Buffer(content.body);
        config = content.attributes;
        var relativePath = path.relative(directory + path.sep + options.root, file.path);
        config.path = relativePath.split(path.sep).join('/');

        if(config.url && options.baseUrl) {
          config.url = path.join(options.baseUrl, config.url);
        }

        configs.push(config);
      }
    }

    this.push(file);

    return cb();
  }

  function endStream(cb) {
    var self = this;
    var appPath = options.path;
    var basePath = path.dirname(appPath);

    mkdirp.sync(basePath, options.mkdirp);

    configs.sort(function(a, b) {
      return a.url < b.url;
    });

    fs.writeFile(appPath, 'var foundationRoutes = ' + JSON.stringify(configs) + '; \n', function(err) {
      if(err) throw err;
      cb();
    });
  }

  return through.obj(bufferContents, endStream);
};
