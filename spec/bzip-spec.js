const archive = require('../src/ls-archive');
const path = require('path');

describe("bzipped tar files", function() {
  let fixturesRoot = null;

  beforeEach(() => fixturesRoot = path.join(__dirname, 'fixtures'));

  describe(".list()", function() {
    describe("when the archive file exists", function() {
      it("returns files in the bzipped tar archive", function() {
        let bzipPaths = null;
        const callback = (error, paths) => bzipPaths = paths;
        archive.list(path.join(fixturesRoot, 'one-file.tar.bz2'), callback);
        waitsFor(() => bzipPaths != null);
        runs(function() {
          expect(bzipPaths.length).toBe(1);
          expect(bzipPaths[0].path).toBe('file.txt');
          expect(bzipPaths[0].isDirectory()).toBe(false);
          expect(bzipPaths[0].isFile()).toBe(true);
          expect(bzipPaths[0].isSymbolicLink()).toBe(false);
        });
      });

      it("returns files in the bzipped tar archive", function() {
        let bzipPaths = null;
        const callback = (error, paths) => bzipPaths = paths;
        archive.list(path.join(fixturesRoot, 'one-file.tbz'), callback);
        waitsFor(() => bzipPaths != null);
        runs(function() {
          expect(bzipPaths.length).toBe(1);
          expect(bzipPaths[0].path).toBe('file.txt');
          expect(bzipPaths[0].isDirectory()).toBe(false);
          expect(bzipPaths[0].isFile()).toBe(true);
          expect(bzipPaths[0].isSymbolicLink()).toBe(false);
        });
      });

      it("returns files in the bzipped tar archive", function() {
        let bzipPaths = null;
        const callback = (error, paths) => bzipPaths = paths;
        archive.list(path.join(fixturesRoot, 'one-file.tbz2'), callback);
        waitsFor(() => bzipPaths != null);
        runs(function() {
          expect(bzipPaths.length).toBe(1);
          expect(bzipPaths[0].path).toBe('file.txt');
          expect(bzipPaths[0].isDirectory()).toBe(false);
          expect(bzipPaths[0].isFile()).toBe(true);
          expect(bzipPaths[0].isSymbolicLink()).toBe(false);
        });
      });

      it("returns folders in the bzipped tar archive", function() {
        let bzipPaths = null;
        const callback = (error, paths) => bzipPaths = paths;
        archive.list(path.join(fixturesRoot, 'one-folder.tar.bz2'), callback);
        waitsFor(() => bzipPaths != null);
        runs(function() {
          expect(bzipPaths.length).toBe(1);
          expect(bzipPaths[0].path).toBe('folder');
          expect(bzipPaths[0].isDirectory()).toBe(true);
          expect(bzipPaths[0].isFile()).toBe(false);
          expect(bzipPaths[0].isSymbolicLink()).toBe(false);
        });
      });

      it("returns folders in the bzipped tar archive", function() {
        let bzipPaths = null;
        const callback = (error, paths) => bzipPaths = paths;
        archive.list(path.join(fixturesRoot, 'one-folder.tbz'), callback);
        waitsFor(() => bzipPaths != null);
        runs(function() {
          expect(bzipPaths.length).toBe(1);
          expect(bzipPaths[0].path).toBe('folder');
          expect(bzipPaths[0].isDirectory()).toBe(true);
          expect(bzipPaths[0].isFile()).toBe(false);
          expect(bzipPaths[0].isSymbolicLink()).toBe(false);
        });
      });

      it("returns folders in the bzipped tar archive", function() {
        let bzipPaths = null;
        const callback = (error, paths) => bzipPaths = paths;
        archive.list(path.join(fixturesRoot, 'one-folder.tbz2'), callback);
        waitsFor(() => bzipPaths != null);
        runs(function() {
          expect(bzipPaths.length).toBe(1);
          expect(bzipPaths[0].path).toBe('folder');
          expect(bzipPaths[0].isDirectory()).toBe(true);
          expect(bzipPaths[0].isFile()).toBe(false);
          expect(bzipPaths[0].isSymbolicLink()).toBe(false);
        });
      });
    });

    describe("when the archive path does not exist", () => it("calls back with an error", function() {
      const archivePath = path.join(fixturesRoot, 'not-a-file.tar.bz2');
      let pathError = null;
      const callback = error => pathError = error;
      archive.list(archivePath, callback);
      waitsFor(() => pathError != null);
      runs(() => expect(pathError.message.length).toBeGreaterThan(0));
    }));

    describe("when the archive path isn't a valid bzipped tar file", () => it("calls back with an error", function() {
      const archivePath = path.join(fixturesRoot, 'invalid.tar.bz2');
      let pathError = null;
      const callback = error => pathError = error;
      archive.list(archivePath, callback);
      waitsFor(() => pathError != null);
      runs(() => expect(pathError.message.length).toBeGreaterThan(0));
    }));

    describe("when the second to last extension isn't .tar", () => it("calls back with an error", function() {
      const archivePath = path.join(fixturesRoot, 'invalid.txt.bz2');
      let pathError = null;
      const callback = (error, contents) => pathError = error;
      archive.list(archivePath, callback);
      waitsFor(() => pathError != null);
      runs(() => expect(pathError.message.length).toBeGreaterThan(0));
    }));
  });

  describe(".readFile()", function() {
    describe("when the path exists in the archive", function() {
      it("calls back with the contents of the given path", function() {
        const archivePath = path.join(fixturesRoot, 'one-file.tar.bz2');
        let pathContents = null;
        const callback = (error, contents) => pathContents = contents;
        archive.readFile(archivePath, 'file.txt', callback);
        waitsFor(() => pathContents != null);
        runs(() => expect(pathContents.toString()).toBe('hello\n'));
      });

      it("calls back with the contents of the given path", function() {
        const archivePath = path.join(fixturesRoot, 'one-file.tbz');
        let pathContents = null;
        const callback = (error, contents) => pathContents = contents;
        archive.readFile(archivePath, 'file.txt', callback);
        waitsFor(() => pathContents != null);
        runs(() => expect(pathContents.toString()).toBe('hello\n'));
      });

      it("calls back with the contents of the given path", function() {
        const archivePath = path.join(fixturesRoot, 'one-file.tbz2');
        let pathContents = null;
        const callback = (error, contents) => pathContents = contents;
        archive.readFile(archivePath, 'file.txt', callback);
        waitsFor(() => pathContents != null);
        runs(() => expect(pathContents.toString()).toBe('hello\n'));
      });
    });

    describe("when the path does not exist in the archive", () => it("calls back with an error", function() {
      const archivePath = path.join(fixturesRoot, 'one-file.tar.bz2');
      let pathError = null;
      const callback = (error, contents) => pathError = error;
      archive.readFile(archivePath, 'not-a-file.txt', callback);
      waitsFor(() => pathError != null);
      runs(() => expect(pathError.message.length).toBeGreaterThan(0));
    }));

    describe("when the archive path does not exist", () => it("calls back with an error", function() {
      const archivePath = path.join(fixturesRoot, 'not-a-file.tar.bz2');
      let pathError = null;
      const callback = (error, contents) => pathError = error;
      archive.readFile(archivePath, 'not-a-file.txt', callback);
      waitsFor(() => pathError != null);
      runs(() => expect(pathError.message.length).toBeGreaterThan(0));
    }));

    describe("when the archive path isn't a valid bzipped tar file", () => it("calls back with an error", function() {
      const archivePath = path.join(fixturesRoot, 'invalid.tar.bz2');
      let pathError = null;
      const callback = (error, contents) => pathError = error;
      archive.readFile(archivePath, 'invalid.txt', callback);
      waitsFor(() => pathError != null);
      runs(() => expect(pathError.message.length).toBeGreaterThan(0));
    }));

    describe("when the second to last extension isn't .tar", () => it("calls back with an error", function() {
      const archivePath = path.join(fixturesRoot, 'invalid.txt.bz2');
      let pathError = null;
      const callback = (error, contents) => pathError = error;
      archive.readFile(archivePath, 'invalid.txt', callback);
      waitsFor(() => pathError != null);
      runs(() => expect(pathError.message.length).toBeGreaterThan(0));
    }));
  });

  describe(".readBzip()", function() {
    it("calls back with the string contents of the archive", function() {
      const archivePath = path.join(fixturesRoot, 'file.txt.bz2');
      let archiveContents = null;
      const callback = (error, contents) => archiveContents = contents;
      archive.readBzip(archivePath, callback);
      waitsFor(() => archiveContents != null);
      runs(() => expect(archiveContents.toString()).toBe('hello\n'));
    });

    describe("when the archive path isn't a valid bzipped tar file", () => it("calls back with an error", function() {
      const archivePath = path.join(fixturesRoot, 'invalid.tar.bz2');
      let readError = null;
      const callback = (error, contents) => readError = error;
      archive.readBzip(archivePath, callback);
      waitsFor(() => readError != null);
      runs(() => expect(readError.message.length).toBeGreaterThan(0));
    }));

    describe("when the archive path does not exist", () => it("calls back with an error", function() {
      const archivePath = path.join(fixturesRoot, 'not-a-file.tar.bz2');
      let readError = null;
      const callback = (error, contents) => readError = error;
      archive.readBzip(archivePath, callback);
      waitsFor(() => readError != null);
      runs(() => expect(readError.message.length).toBeGreaterThan(0));
    }));
  });
});
