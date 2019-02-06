exports.backup = function (req, res) {
    let tp = require('tedious-promises');
    tp.setConnectionConfig(require(`${__dirname}/../../.config/www/mssql.json`));
    tp.sql(`SELECT name FROM master.sys.databases WHERE database_id > 4`).execute()
    .then(function (results) {
        res.send(results);
        backup(results);
    }).fail(function(err) {
        res.send(err);
    });
}

function backup(list){
    if(list.length > 0) {
        
        let tp = require('tedious-promises');
        tp.setConnectionConfig(require(`${__dirname}/../../.config/www/mssql.json`));
        tp.sql(`EXEC ${list[0].name}..sp_BackupDatabase '/data/database/backup/'`).execute()
        .then(function (results) {
            console.log(`Backup Database ${list[0].name} Success`);
            console.log(results);
            list = list.splice(1);
            backup(list);
        }).fail(function(err) {
            console.log(`Backup Database ${list[0].name} Error : ${err}`);
            list = list.splice(1);
            backup(list);
        });

    } else {
        console.log('success');
        return true;
    }
}