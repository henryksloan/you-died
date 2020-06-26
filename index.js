const express = require('express')
const formidable = require('formidable');
const path = require('path');
const fs = require('fs');

const { execFile } = require('child_process');
const gifsicle = require('gifsicle');

const PORT = process.env.PORT || 5000

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/test', (req, res) => res.render('pages/test'))
  .post('/api/upload', (req, res, next) => {
      const form = formidable({uploadDir: __dirname + '/uploads', keepExtensions: true});

      form.parse(req, (err, fields, files) => {
          if (err) {
              next(err);
              return;
          }
          console.log(files);
          execFile(gifsicle, ['--resize', '498x280', files.gifInput.path, '-o', files.gifInput.path + '.resized.gif'], err => {
              console.log(err);
              console.log('Image resized!');
              execFile(gifsicle, ['--merge', files.gifInput.path + '.resized.gif', 'awake.gif', '-o', files.gifInput.path + '.merged.gif'], err => {
                  console.log(err);
                  console.log('Images merged!');
                  fs.unlink(files.gifInput.path, (err) => {
                      if (err) { console.error(err); }
                  });

                  fs.unlink(files.gifInput.path + '.resized.gif', (err) => {
                      if (err) { console.error(err); }
                  });
                  res.redirect('/download/' + path.basename(files.gifInput.path) + '.merged.gif');
              });
          });
      });
  })
  .get('/download/:file', (req, res) => {
      res.sendFile(`${__dirname}/uploads/${req.params.file}`);
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
