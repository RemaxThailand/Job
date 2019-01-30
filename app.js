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
    db.ref(`serial/TH/0001/stock/190100000112615`).once('value', function (snapshot) {
        res.json(snapshot.val());
    });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));