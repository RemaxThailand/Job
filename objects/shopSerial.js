exports.sync = function (req, res) {
    let tp = require('tedious-promises');
    tp.setConnectionConfig(require(`${__dirname}/../../.config/www/mssql.json`));
    tp.sql(`EXEC Firebase..sp_ShopSerialSync`).execute()
    .then(function (results) {
        res.send(results);
    }).fail(function(err) {
        res.send(err);
    });
}