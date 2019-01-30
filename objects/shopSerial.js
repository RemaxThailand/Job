exports.sync = function (req, res) {
    let tp = require('tedious-promises');
    tp.setConnectionConfig(require(`${__dirname}/../../.config/www/mssql.json`));
    tp.sql(`EXEC Firebase..sp_ShopSerialSync`).execute()
    .then(function (results) {
        res.send('OK');
    }).fail(function(err) {
        res.send(err);
    });
}

exports.firebaseUpdate = function (req, res) {
    deleteData(req, res);
};

function deleteData(req, res) {
    let msg = {
        delete: {},
        update: {}
    }
    let tp = require('tedious-promises');
    tp.setConnectionConfig(require(`${__dirname}/../../.config/www/mssql.json`));
    tp.sql(`EXEC Firebase..sp_ShopSerialSyncData 'delete'`).execute().then(function (results) {
        let all = results.length;
        if (all > 0) {
            let success = 0;
            let arr = [];
            results.forEach(result => {
                db.ref(`serial/TH/${result.shop}/stock/${result.id}`).remove(function (error) {
                    success++;
                    if (error) {
                        console.log(`Delete Serial ${result.id} Error (${error})`);
                    } else {
                        arr.push(`'${result.id}-${result.product}-${result.shop}'`);
                        console.log(`Delete Serial ${result.id} Success (${success}/${all})`);
                    }
                    if (success >= all) {
                        msg.delete = { success: true, result: arr.toString()};
                        tp.sql(`DELETE FROM Firebase..ShopSerial WHERE CONCAT(id,'-', product,'-', shop) IN (${arr.toString()})`).execute();
                        setTimeout(function () {
                            updateData(req, res, msg);
                        }, 1000);
                    }
                })
            });
        } else {
            msg.delete = 'No Delete Data';
            updateData(req, res, msg);
        }
    }).fail(function (err) {
        msg.delete = err;
        updateData(req, res, msg);
    });
}


function updateData(req, res, msg) {
    let tp = require('tedious-promises');
    tp.setConnectionConfig(require(`${__dirname}/../../.config/www/mssql.json`));
    tp.sql(`EXEC Firebase..sp_ShopSerialSyncData 'update'`).execute().then(function (results) {
        let all = results.length;
        if (all > 0) {
            let success = 0;
            let arr = [];
            results.forEach(result => {
                //db.ref(`po/TH/0001/info/${result.id}/id`).set(result.id);
                db.ref(`serial/TH/${result.shop}/stock/${result.id}`).update({
                    product: result.product
                }, function (error) {
                    success++;
                    if (error) {
                        console.log(`Update Serial ${result.id} Error (${error})`);
                    } 
                    else {
                        arr.push(`'${result.id}-${result.product}-${result.shop}'`);
                        console.log(`Update Serial ${result.poId} Success (${success}/${all})`);
                    }
                    if(success >= all) {
                        msg.update = { success: true, result: arr.toString()};
                        res.send(msg);
                        tp.sql(`UPDATE Firebase..ShopSerial SET isSync = 1, syncDate = GETDATE() WHERE CONCAT(id,'-', product,'-', shop) IN (${arr.toString()})`).execute();
                        setTimeout(function() {
                            process.exit(1);
                        }, 10000);
                    }
                })
            });
        } else {
            msg.update = 'No Update Data';
            res.send(msg);
            process.exit(1);
        }
    }).fail(function (err) {
        msg.update = err;
        res.send(msg);
        process.exit(1);
    });
}