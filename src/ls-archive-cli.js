const path = require("path");
const async = require("async");
const colors = require("colors");
const optimist = require("optimist");
const archive = require("./ls-archive.js");

module.exports = function() {
  const cli = optimist.usage(`Usage: lsa [file ...]

List the files and folders inside an archive file.

Supports .zip, .tar, .tar.gz, .tgz, .tar.bz2, .tbz and .tbz2 files.`)
    .describe('colors', 'Enable colored output')
    .default('colors', true)
    .boolean('colors')
    .describe('help', 'Show this message')
    .alias('h', 'help')
    .demand(1);

  if (cli.argv.help) {
    cli.showHelp();
    return;
  }
  if (!cli.argv.colors) {
    colors.setTheme({
      cyan: 'stripColors',
      red: 'stripColors'
    });
  }
  let queue = async.queue(function(archivePath, callback) {
    return (function(archivePath) {
      return archive.list(archivePath, function(error, files) {
        if (error != null) {
          console.error(`Error reading: ${archivePath}`.red);
        } else {

          console.log(`${archivePath.cyan} (${files.length})`);
          for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let prefix;
            if (i === files.length - 1) {
              prefix = '\u2514\u2500\u2500 ';
            } else {
              prefix = '\u251C\u2500\u2500 ';
            }
            console.log(`${prefix}${file.getPath()}`);
          }

          console.log();
        }
        return callback();
      });
    })(archivePath);
  });

  let files = cli.argv._;
  return files.forEach(function(file) {
    return queue.push(path.resolve(process.cwd(), file));
  });
};
