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
    tp.sql(`EXEC Firebase..sp_PODetailSyncData 'delete'`).execute().then(function (results) {
        let all = results.length;
        if (all > 0) {
            let success = 0;
            let arr = [];
            results.forEach(result => {
                db.ref(`po/TH/0001/info/${result.id}/detail/${result.product}`).remove(function (error) {
                    success++;
                    if (error) {
                        console.log(`Delete Po No. ${result.poId} Error (${error})`);
                    } else {
                        arr.push(`'${result.poId}-${result.product}'`);
                        //console.log(`Delete Serial ${result.id} Success (${success}/${all})`);
                    }
                    if (success >= all) {
                        msg.delete = { success: true, result: arr.toString()};
                        tp.sql(`DELETE FROM Firebase..PODetail WHERE CONCAT(id,'-',product) IN (${arr.toString()})`).execute();
                        console.log(msg.delete);
                        setTimeout(function () {
                            updateData(req, res, msg);
                        }, 1000);
                    }
                })
            });
        } else {
            msg.delete = 'No Delete Data';
            console.log(msg.delete);
            updateData(req, res, msg);
        }
    }).fail(function (err) {
        msg.delete = err;
        console.log(msg.delete);
        updateData(req, res, msg);
    });
}


function updateData(req, res, msg) {
    let tp = require('tedious-promises');
    tp.setConnectionConfig(require(`${__dirname}/../../.config/www/mssql.json`));
    tp.sql(`EXEC Firebase..sp_PODetailSyncData 'update'`).execute().then(function (results) {
        let all = results.length;
        if (all > 0) {
            let success = 0;
            let arr = [];
            results.forEach(result => {
                //db.ref(`po/TH/0001/info/${result.id}/id`).set(result.id);
                db.ref(`po/TH/0001/info/${result.id}/detail/${result.product}`).update({
                    buy: result.buy
                }, function (error) {
                    success++;
                    if (error) {
                        console.log(`Update Po No. ${result.id} Error (${error})`);
                    } 
                    else {
                        arr.push(`'${result.poId}-${result.product}'`);
                        //console.log(`Update Serial ${result.id} Success (${success}/${all})`);
                    }
                    if(success >= all) {
                        msg.update = { success: true, result: arr.toString()};
                        res.send(msg);
                        tp.sql(`UPDATE Firebase..PODetail SET isSync = 1, syncDate = GETDATE() WHERE CONCAT(id,'-',product) IN (${arr.toString()})`).execute();
                        console.log(msg.update);
                        return true;
                    }
                })
            });
        } else {
            msg.update = 'No Update Data';
            res.send(msg);
            return true;
        }
    }).fail(function (err) {
        msg.update = err;
        res.send(msg);
        return true;
    });
}