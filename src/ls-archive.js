const fs = require("fs");
const path = require("path");
const util = require("util");

class ArchiveEntry {
  constructor(path1, type) {
    this.path = path1;
    this.type = type;
    if (this.isDirectory()) {
      this.children = [];
    }
  }

  add(entry) {
    if (!this.isParentOf(entry)) {
      return false;
    }
    let segments = entry.getPath().substring(this.getPath().length + 1).split(path.sep);
    if (segments.length === 0) {
      return false;
    }
    if (segments.length === 1) {
      this.children.push(entry);
      return true;
    } else {
      let name = segments[0];
      let child = findEntryWithName(this.children, name);
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

}

function findEntryWithName(entries, name) {
  for (let i = 0; i < entries.length; i++) {
    let entry = entries[i];
    if (name === entry.getName()) {
      return entry;
    }
  }
}

function convertToTree(entries) {
  let rootEntries = [];

  for (let i = 0; i < entries.length; i++) {
    let entry = entries[i];
    let segments = entry.getPath().split(path.sep);

    if (segments.length === 1) {
      rootEntries.push(entry);
    } else {
      let name = segments[0];
      let parent = findEntryWithName(rootEntries, name);
      if (parent == null) {
        parent = new ArchiveEntry(name, 5);
        rootEntries.push(parent);
      }
      parent.add(entry);
    }
  }
  return rootEntries;
}

function wrapCallback(cb) {
  let called = false;

  return function(error, data) {
    if (!called) {
      if ((error != null) && !util.isError(error)) {
        error = new Error(error);
      }
      called = true;
      return cb(error, data);
    }
  };
}

function listZip(archivePath, options, callback) {
  const yauzl = require("yauzl");
  let entries = [];
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
}

function listGzip(archivePath, options, callback) {
  const zlib = require("zlib");
  let fileStream = fs.createReadStream(archivePath);
  fileStream.on("error", callback);

  let gzipStream = fileStream.pipe(zlib.createGunzip());
  gzipStream.on("error", callback);

  return listTarStream(gzipStream, options, callback);
}

function listBzip(archivePath, options, callback) {
  const bzip = require("unbzip2-stream");

  let fileStream = fs.createReadStream(archivePath);
  fileStream.on("error", callback);

  let bzipStream = fileStream.pipe(bzip());
  bzipStream.on("error", callback);

  return listTarStream(bzipStream, options, callback);
}

function listTar(archivePath, options, callback) {
  let fileStream = fs.createReadStream(archivePath);
  fileStream.on("error", callback);

  return listTarStream(fileStream, options, callback);
}

function listTarStream(inputStream, options, callback) {
  let entries = [];
  let tarStream = inputStream.pipe(require("tar").Parse());
  tarStream.on("error", callback);
  tarStream.on("entry", function(entry) {
    let entryPath;
    if (entry.props.path.slice(-1) === "/") {
      entryPath = entry.props.path.slice(0, -1);
    } else {
      entryPath = entry.props.path;
    }
    let entryType = parseInt(entry.props.type);
    entryPath = entryPath.replace(/\//g, path.sep);
    return entries.push(new ArchiveEntry(entryPath, entryType));
  });
  return tarStream.on("end", function () {
    if (options.tree) {
      entries = convertToTree(entries);
    }
    return callback(null, entries);
  });
}

function readFileFromZip(archivePath, filePath, callback) {
  const yauzl = require("yauzl");
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
}

function readFileFromGzip(archivePath, filePath, callback) {
  let fileStream = fs.createReadStream(archivePath);
  fileStream.on("error", callback);
  let gzipStream = fileStream.pipe(require("zlib").createGunzip());
  gzipStream.on("error", callback);
  gzipStream.on("end", function() {
    return callback(`${filePath} does not exist in the archive: ${archivePath}`);
  });
  return readFileFromTarStream(gzipStream, archivePath, filePath, callback);
}

function readFileFromBzip(archivePath, filePath, callback) {
  let fileStream = fs.createReadStream(archivePath);
  fileStream.on("error", callback);
  let bzipStream = fileStream.pipe(require("unbzip2-stream")());
  bzipStream.on("error", callback);
  bzipStream.on("end", function() {
    return callback(`${filePath} does not exist in the archive: ${archivePath}`);
  });
  return readFileFromTarStream(bzipStream, archivePath, filePath, callback);
}

function readFileFromTar(archivePath, filePath, callback) {
  let fileStream = fs.createReadStream(archivePath);
  fileStream.on('error', callback);
  fileStream.on('end', function() {
    return callback(`${filePath} does not exist in the archive: ${archivePath}`);
  });
  return readFileFromTarStream(fileStream, archivePath, filePath, callback);
}

function readFileFromTarStream(inputStream, archivePath, filePath, callback) {
  const tar = require("tar");
  let tarStream = inputStream.pipe(tar.Parse());
  tarStream.on("error", callback);

  return tarStream.on("entry", function(entry) {
    if (filePath !== entry.props.path.replace(/\//g, path.sep)) {
      return;
    }
    if (entry.props.type === "0") {
      return readEntry(entry, callback);
    } else {
      return callback(`${filePath} is not a normal file in the archive: ${archivePath}`);
    }
  });
}

function readEntry(entry, callback) {
  let contents = [];

  entry.on("data", function(data) {
    return contents.push(data);
  });

  return entry.on("end", function() {
    return callback(null, Buffer.concat(contents));
  });
}

function isTarPath(archivePath) {
  return path.extname(archivePath) === ".tar";
}

function isZipPath(archivePath) {
  let ext = path.extname(archivePath);
  let exts = [".epub", ".jar", ".love", ".war", ".zip", ".egg", ".whl", ".xpi", ".nupkg"];
  return exts.includes(ext);
}

function isGzipPath(archivePath) {
  return path.extname(archivePath) === ".tgz" || path.extname(path.basename(archivePath, ".gz")) === ".tar";
}

function isBzipPath(archivePath) {
  return path.extname(archivePath) === ".tbz" || path.extname(archivePath) === ".tbz2" || path.extname(path.basename(archivePath, ".bz2")) === ".tar";
}

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
    callback = wrapCallback(callback);
    const zlib = require("zlib");
    let fileStream = fs.createReadStream(gzipArchivePath);
    fileStream.on("error", callback);
    let gzipStream = fileStream.pipe(zlib.createGunzip());
    gzipStream.on("error", callback);
    let chunks = [];

    gzipStream.on("data", function(chunk) {
      return chunks.push(chunk);
    });
    return gzipStream.on("end", function() {
      return callback(null, Buffer.concat(chunks));
    });
  },
  readBzip: function(bzipArchivePath, callback) {
    callback = wrapCallback(callback);
    const bzip = require("unbzip2-stream");
    let fileStream = fs.createReadStream(bzipArchivePath);
    fileStream.on("error", callback);
    let bzipStream = fileStream.pipe(bzip());
    bzipStream.on("error", callback);
    let chunks = [];
    bzipStream.on("data", function(chunk) {
      return chunks.push(chunk);
    });
    return bzipStream.on("end", function() {
      return callback(null, Buffer.concat(chunks));
    });
  },
};
