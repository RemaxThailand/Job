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
    tp.sql(`EXEC Firebase..sp_POHeaderSyncData 'delete'`).execute().then(function (results) {
        let all = results.length;
        if (all > 0) {
            let success = 0;
            let arr = [];
            results.forEach(result => {
                db.ref(`po/TH/0001/info/${result.id}`).remove(function (error) {
                    success++;
                    if (error) {
                        console.log(`Delete PO No. ${result.id} Error (${error})`);
                    } 
                    else {
                        arr.push(`'${result.id}'`);
                        //console.log(`Delete Serial ${result.id} Success (${success}/${all})`);
                    }
                    if (success >= all) {
                        msg.delete = { success: true, result: arr.toString()};
                        tp.sql(`DELETE FROM Firebase..POHeader WHERE id IN (${arr.toString()})`).execute();
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
    tp.sql(`EXEC Firebase..sp_POHeaderSyncData 'update'`).execute().then(function (results) {
        let all = results.length;
        if (all > 0) {
            let success = 0;
            let arr = [];
            results.forEach(result => {
                db.ref(`po/TH/0001/info/${result.id}`).update({
                    buyNo: result.buyNo,
                    docNo: result.buyNo,
                    poId: result.poId,
                    poBill: result.poBill,
                    totalPrice: result.totalPrice,
                    supplier: result.supplier,
                    supplierName: result.supplierName,
                    addDate: result.addDate
                }, function (error) {
                    success++;
                    if (error) {
                        console.log(`Update PO No. ${result.id} Error (${error})`);
                    } 
                    else {
                        arr.push(`'${result.id}'`);
                        //console.log(`Update Serial ${result.id} Success (${success}/${all})`);
                    }
                    if(success >= all) {
                        msg.update = { success: true, result: arr.toString()};
                        res.send(msg);
                        tp.sql(`UPDATE Firebase..POHeader SET isSync = 1, syncDate = GETDATE() WHERE id IN (${arr.toString()})`).execute();
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