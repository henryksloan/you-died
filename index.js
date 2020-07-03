const express = require('express');
const rateLimit = require("express-rate-limit");
const formidable = require('formidable');
const path = require('path');
const fs = require('fs');

const { execFile } = require('child_process');
const gifsicle = require('gifsicle');

const PORT = process.env.PORT || 5000;

const MEME_FILES = {
    "youDied": "you_died.gif",
    "awake": "awake.gif"
};

function deleteIfFound(filename) {
    if (fs.existsSync(filename)) {
        fs.unlink(filename, (err) => {
            if (err) { console.error(err); }
        });
    }
}

function trimExtension(filename) {
    return filename.replace(/\.[^/.]+$/, "");
}

function resizedName(filename) {
    return trimExtension(filename) + "_resized.gif";
}

function mergedName(filename) {
    return trimExtension(filename) + "_merged.gif";
}

function resizeCmd(filename) {
    return ['--resize', '498x280', filename,
            '-o', resizedName(filename)];
}

function mergeCmd(filename, memeType) {
    return ['--merge', resizedName(filename), MEME_FILES[memeType],
            '-o', mergedName(filename)]
}

app = express();

if (app.get('env') === 'production') {
    app.set('trust proxy', 1);
}

const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: "Uploading too fast"
});

app
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .post('/api/upload', uploadLimiter, (req, res, next) => {
      const form = formidable({
          uploadDir: __dirname + '/uploads',
          keepExtensions: true, // TODO: this can be false (default) if I get rid of extension trimming
          maxFileSize: 35 * 1024 * 1024 // 35MB
      });

      form.parse(req, (err, fields, files) => {
          if (err) {
              next(err);
              return;
          }

          let filename = files.gifInput.path;
          let memeType = fields.memeType;

          if (!(memeType in MEME_FILES)) {
              deleteIfFound(filename);
              return res.status(400).send({
                  message: "Invalid meme type " + memeType
              });
          }

          if (files.gifInput.type !== 'image/gif') {
              deleteIfFound(filename);
              return res.status(400).send({
                  message: "Invalid file type " + files.gifInput.type
              });
          }

          let cancelled = false;
          req.on("close", function() {
              cancelled = true;
          });

          execFile(gifsicle, resizeCmd(filename), err => {
              if (err) {
                  console.log(err);
                  return;
              }
              else if (cancelled) {
                  deleteIfFound(filename);
                  deleteIfFound(resizedName(filename));
                  return;
              }

              console.log('Image resized!');
              execFile(gifsicle, mergeCmd(filename, memeType), err => {
                  deleteIfFound(filename);
                  deleteIfFound(resizedName(filename));

                  if (err) { console.log(err); }
                  else if (cancelled) { deleteIfFound(mergedName(filename)); }
                  else {
                      console.log('Images merged!');
                      res.redirect('/download/' + path.basename(mergedName(filename)));
                  }
              });
          });
      });
  })
  .get('/download/:file', (req, res) => {
      res.sendFile(`${__dirname}/uploads/${req.params.file}`);
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
