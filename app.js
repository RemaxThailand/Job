const express = require('express'),
    admin = require('firebase-admin')

const app = express();
const port = process.env.PORT | 3000;

try {
    admin.initializeApp({
        credential: admin.credential.cert(require(`${__dirname}/../.config/www/credential-power-system-api.json`)),
        databaseURL: 'https://power-system-api.firebaseio.com'
    });
} catch (err) {}

global.db = admin.database();

app.get('*', function(req, res) {
	res.header('Access-Control-Allow-Origin', '*');

	var url = req.url.split('/');
	url = url.filter(function(n){ return n !== ''; });
	if ( url.length >= 2 ) {
        try {
            return eval(`require('./objects/${url[0]}').${url[1]}(req, res)`);
        } catch (err) {
            console.error(err);
            return { success: false, error: { message: `Action ${url[0]} > ${url[1]} is not implemented` } }
        }
    }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));