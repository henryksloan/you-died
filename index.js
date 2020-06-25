const express = require('express')
const formidable = require('formidable');
const path = require('path')

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
          execFile(gifsicle, ['--resize'], err => {
              console.log(err);
          });
          execFile(gifsicle, ['--resize', '498x280', files.someExpressFiles.path, '-o', files.someExpressFiles.path + '.cropped.gif'], err => {
              console.log(err);
              console.log('Image cropped!');
              execFile(gifsicle, ['--merge', files.someExpressFiles.path + '.cropped.gif', 'awake.gif', '-o', files.someExpressFiles.path + '.merged.gif'], err => {
                  console.log(err);
                  console.log('Images merged!');
                  // res.redirect('/download/' + files.someExpressFiles.path.split(__dirname + "\\uploads\\")[1]+'.merged.gif');
                  res.redirect('/download/' + path.basename(files.someExpressFiles.path) + '.merged.gif');
              });
          });
          // res.send(`<img src="${files.someExpressFiles.path.split(__dirname)[1]}" alt="image"/>`);
          // res.json({fields, files});
      });
  })
  .get('/download/:file', (req, res) => {
      res.sendFile(`${__dirname}/uploads/${req.params.file}`);
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
