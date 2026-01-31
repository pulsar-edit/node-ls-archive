var ArchiveEntry, convertToTree, findEntryWithName, fs, isBzipPath, isGzipPath, isTarPath, isZipPath, listBzip, listGzip, listTar, listTarStream, listZip, path, readEntry, readFileFromBzip, readFileFromGzip, readFileFromTar, readFileFromTarStream, readFileFromZip, util, wrapCallback;

fs = require('fs');

path = require('path');

util = require('util');

ArchiveEntry = class ArchiveEntry {
  constructor(path1, type) {
    this.path = path1;
    this.type = type;
    if (this.isDirectory()) {
      this.children = [];
    }
  }

  add(entry) {
    var child, name, segments;
    if (!this.isParentOf(entry)) {
      return false;
    }
    segments = entry.getPath().substring(this.getPath().length + 1).split(path.sep);
    if (segments.length === 0) {
      return false;
    }
    if (segments.length === 1) {
      this.children.push(entry);
      return true;
    } else {
      name = segments[0];
      child = findEntryWithName(this.children, name);
      if (child == null) {
        child = new ArchiveEntry(`${this.getPath()}${path.sep}${name}`, 5);
        this.children.push(child);
      }
      if (child.isDirectory()) {
        return child.add(entry);
      } else {
        return false;
      }
    }
  }

  isParentOf(entry) {
    return this.isDirectory() && entry.getPath().indexOf(`${this.getPath()}${path.sep}`) === 0;
  }

  getPath() {
    return this.path;
  }

  getName() {
    return this.name != null ? this.name : this.name = path.basename(this.path);
  }

  isFile() {
    return this.type === 0;
  }

  isDirectory() {
    return this.type === 5;
  }

  isSymbolicLink() {
    return this.type === 2;
  }

  toString() {
    return this.getPath();
  }

};

findEntryWithName = function(entries, name) {
  var entry, i, len;
  for (i = 0, len = entries.length; i < len; i++) {
    entry = entries[i];
    if (name === entry.getName()) {
      return entry;
    }
  }
};

convertToTree = function(entries) {
  var entry, i, len, name, parent, rootEntries, segments;
  rootEntries = [];
  for (i = 0, len = entries.length; i < len; i++) {
    entry = entries[i];
    segments = entry.getPath().split(path.sep);
    if (segments.length === 1) {
      rootEntries.push(entry);
    } else {
      name = segments[0];
      parent = findEntryWithName(rootEntries, name);
      if (parent == null) {
        parent = new ArchiveEntry(name, 5);
        rootEntries.push(parent);
      }
      parent.add(entry);
    }
  }
  return rootEntries;
};

wrapCallback = function(callback) {
  var called;
  called = false;
  return function(error, data) {
    if (!called) {
      if ((error != null) && !util.isError(error)) {
        error = new Error(error);
      }
      called = true;
      return callback(error, data);
    }
  };
};

listZip = function(archivePath, options, callback) {
  var entries, yauzl;
  yauzl = require('yauzl');
  entries = [];
  return yauzl.open(archivePath, {
    lazyEntries: true
  }, function(error, zipFile) {
    if (error) {
      return callback(error);
    }
    zipFile.readEntry();
    zipFile.on('error', callback);
    zipFile.on('entry', function(entry) {
      var entryPath, entryType;
      if (entry.fileName.slice(-1) === '/') {
        entryPath = entry.fileName.slice(0, -1);
        entryType = 5;
      } else {
        entryPath = entry.fileName;
        entryType = 0;
      }
      entryPath = entryPath.replace(/\//g, path.sep);
      entries.push(new ArchiveEntry(entryPath, entryType));
      return zipFile.readEntry();
    });
    return zipFile.on('end', function() {
      if (options.tree) {
        entries = convertToTree(entries);
      }
      return callback(null, entries);
    });
  });
};

listGzip = function(archivePath, options, callback) {
  var fileStream, gzipStream, zlib;
  zlib = require('zlib');
  fileStream = fs.createReadStream(archivePath);
  fileStream.on('error', callback);
  gzipStream = fileStream.pipe(zlib.createGunzip());
  gzipStream.on('error', callback);
  return listTarStream(gzipStream, options, callback);
};

listBzip = function(archivePath, options, callback) {
  var bzip, bzipStream, fileStream;
  bzip = require('unbzip2-stream');
  fileStream = fs.createReadStream(archivePath);
  fileStream.on('error', callback);
  bzipStream = fileStream.pipe(bzip());
  bzipStream.on('error', callback);
  return listTarStream(bzipStream, options, callback);
};

listTar = function(archivePath, options, callback) {
  var fileStream;
  fileStream = fs.createReadStream(archivePath);
  fileStream.on('error', callback);
  return listTarStream(fileStream, options, callback);
};

listTarStream = function(inputStream, options, callback) {
  var entries, tarStream;
  entries = [];
  tarStream = inputStream.pipe(require('tar').Parse());
  tarStream.on('error', callback);
  tarStream.on('entry', function(entry) {
    var entryPath, entryType;
    if (entry.props.path.slice(-1) === '/') {
      entryPath = entry.props.path.slice(0, -1);
    } else {
      entryPath = entry.props.path;
    }
    entryType = parseInt(entry.props.type);
    entryPath = entryPath.replace(/\//g, path.sep);
    return entries.push(new ArchiveEntry(entryPath, entryType));
  });
  return tarStream.on('end', function() {
    if (options.tree) {
      entries = convertToTree(entries);
    }
    return callback(null, entries);
  });
};

readFileFromZip = function(archivePath, filePath, callback) {
  var yauzl;
  yauzl = require('yauzl');
  return yauzl.open(archivePath, {
    lazyEntries: true
  }, function(error, zipFile) {
    if (error) {
      return callback(error);
    }
    zipFile.readEntry();
    zipFile.on('error', callback);
    zipFile.on('end', function() {
      return callback(`${filePath} does not exist in the archive: ${archivePath}`);
    });
    return zipFile.on('entry', function(entry) {
      if (filePath !== entry.fileName.replace(/\//g, path.sep)) {
        return zipFile.readEntry();
      }
      if (filePath.slice(-1) !== path.sep) {
        return zipFile.openReadStream(entry, function(error, entryStream) {
          if (error) {
            return callback(error);
          }
          return readEntry(entryStream, callback);
        });
      } else {
        return callback(`${filePath} is not a normal file in the archive: ${archivePath}`);
      }
    });
  });
};

readFileFromGzip = function(archivePath, filePath, callback) {
  var fileStream, gzipStream;
  fileStream = fs.createReadStream(archivePath);
  fileStream.on('error', callback);
  gzipStream = fileStream.pipe(require('zlib').createGunzip());
  gzipStream.on('error', callback);
  gzipStream.on('end', function() {
    return callback(`${filePath} does not exist in the archive: ${archivePath}`);
  });
  return readFileFromTarStream(gzipStream, archivePath, filePath, callback);
};

readFileFromBzip = function(archivePath, filePath, callback) {
  var bzipStream, fileStream;
  fileStream = fs.createReadStream(archivePath);
  fileStream.on('error', callback);
  bzipStream = fileStream.pipe(require('unbzip2-stream')());
  bzipStream.on('error', callback);
  bzipStream.on('end', function() {
    return callback(`${filePath} does not exist in the archive: ${archivePath}`);
  });
  return readFileFromTarStream(bzipStream, archivePath, filePath, callback);
};

readFileFromTar = function(archivePath, filePath, callback) {
  var fileStream;
  fileStream = fs.createReadStream(archivePath);
  fileStream.on('error', callback);
  fileStream.on('end', function() {
    return callback(`${filePath} does not exist in the archive: ${archivePath}`);
  });
  return readFileFromTarStream(fileStream, archivePath, filePath, callback);
};

readFileFromTarStream = function(inputStream, archivePath, filePath, callback) {
  var tar, tarStream;
  tar = require('tar');
  tarStream = inputStream.pipe(tar.Parse());
  tarStream.on('error', callback);
  return tarStream.on('entry', function(entry) {
    if (filePath !== entry.props.path.replace(/\//g, path.sep)) {
      return;
    }
    if (entry.props.type === '0') {
      return readEntry(entry, callback);
    } else {
      return callback(`${filePath} is not a normal file in the archive: ${archivePath}`);
    }
  });
};

readEntry = function(entry, callback) {
  var contents;
  contents = [];
  entry.on('data', function(data) {
    return contents.push(data);
  });
  return entry.on('end', function() {
    return callback(null, Buffer.concat(contents));
  });
};

isTarPath = function(archivePath) {
  return path.extname(archivePath) === '.tar';
};

isZipPath = function(archivePath) {
  var extension;
  extension = path.extname(archivePath);
  return extension === '.epub' || extension === '.jar' || extension === '.love' || extension === '.war' || extension === '.zip' || extension === '.egg' || extension === '.whl' || extension === '.xpi' || extension === '.nupkg';
};

isGzipPath = function(archivePath) {
  return path.extname(archivePath) === '.tgz' || path.extname(path.basename(archivePath, '.gz')) === '.tar';
};

isBzipPath = function(archivePath) {
  return path.extname(archivePath) === '.tbz' || path.extname(archivePath) === '.tbz2' || path.extname(path.basename(archivePath, '.bz2')) === '.tar';
};

module.exports = {
  isPathSupported: function(archivePath) {
    if (!archivePath) {
      return false;
    }
    return isTarPath(archivePath) || isZipPath(archivePath) || isGzipPath(archivePath) || isBzipPath(archivePath);
  },
  list: function(archivePath, options = {}, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (isTarPath(archivePath)) {
      listTar(archivePath, options, wrapCallback(callback));
    } else if (isGzipPath(archivePath)) {
      listGzip(archivePath, options, wrapCallback(callback));
    } else if (isBzipPath(archivePath)) {
      listBzip(archivePath, options, wrapCallback(callback));
    } else if (isZipPath(archivePath)) {
      listZip(archivePath, options, wrapCallback(callback));
    } else {
      callback(new Error(`'${path.extname(archivePath)}' files are not supported`));
    }
    return void 0;
  },
  readFile: function(archivePath, filePath, callback) {
    if (isTarPath(archivePath)) {
      readFileFromTar(archivePath, filePath, wrapCallback(callback));
    } else if (isGzipPath(archivePath)) {
      readFileFromGzip(archivePath, filePath, wrapCallback(callback));
    } else if (isBzipPath(archivePath)) {
      readFileFromBzip(archivePath, filePath, wrapCallback(callback));
    } else if (isZipPath(archivePath)) {
      readFileFromZip(archivePath, filePath, wrapCallback(callback));
    } else {
      callback(new Error(`'${path.extname(archivePath)}' files are not supported`));
    }
    return void 0;
  },
  readGzip: function(gzipArchivePath, callback) {
    var chunks, fileStream, gzipStream, zlib;
    callback = wrapCallback(callback);
    zlib = require('zlib');
    fileStream = fs.createReadStream(gzipArchivePath);
    fileStream.on('error', callback);
    gzipStream = fileStream.pipe(zlib.createGunzip());
    gzipStream.on('error', callback);
    chunks = [];
    gzipStream.on('data', function(chunk) {
      return chunks.push(chunk);
    });
    return gzipStream.on('end', function() {
      return callback(null, Buffer.concat(chunks));
    });
  },
  readBzip: function(bzipArchivePath, callback) {
    var bzip, bzipStream, chunks, fileStream;
    callback = wrapCallback(callback);
    bzip = require('unbzip2-stream');
    fileStream = fs.createReadStream(bzipArchivePath);
    fileStream.on('error', callback);
    bzipStream = fileStream.pipe(bzip());
    bzipStream.on('error', callback);
    chunks = [];
    bzipStream.on('data', function(chunk) {
      return chunks.push(chunk);
    });
    return bzipStream.on('end', function() {
      return callback(null, Buffer.concat(chunks));
    });
  }
};
