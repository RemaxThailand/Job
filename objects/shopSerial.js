exports.sync = function (req, res) {
    let tp = require('tedious-promises');
    tp.setConnectionConfig(require(`${__dirname}/../../.config/www/mssql.json`));
    tp.sql(`EXEC firebase..sp_ShopSerialSync`).execute()
    .then(function (results) {
        res.json(results);
    });
}