// Server

const express = require('express');
const routes = require('./routes')
const bodyParser = require('body-parser')
const session = require('express-session')
const flash = require('express-flash')
// const fileUpload = require('express-fileupload')
// const multer = require('multer')
// const upload = multer({ dest: 'uploads/' })
const app = express();

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

const middleware = [
    // layout(),
    express.static(__dirname + '/public'),
    bodyParser.urlencoded({ extended: true }),
    session({
        secret: 'secret-key',
        key: 'secret-cookie',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 60000 }
    }),
    flash(),
    // fileUpload()
]

app.use(middleware)

app.use('/', routes)

app.use((req, res, next) => {
    res.status(404).send('Sorry, can\'t find that!');
})

// app.get('/', function(req, res) {
//     res.render('index', {
//         static_path: 'static',
//         theme: process.env.THEME || 'flatly',
//         flask_debug: process.env.FLASK_DEBUG || 'false'
//     });
// });
//
// app.post('/import', function(req, res) {
//     res.send('oi ' + req.body);
// });

var port = process.env.PORT || 3000;
app.listen(port, function() {
    console.log('Listening on ' + port +  ' ...');
});
