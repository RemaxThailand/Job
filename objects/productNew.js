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
    tp.sql(`EXEC Firebase..sp_ProductNewSyncData 'delete'`).execute().then(function (results) {
        let all = results.length;
        if (all > 0) {
            let success = 0;
            let arr = [];
            results.forEach(result => {
                db.ref(`product/TH/0001/new/${result.id}`).remove(function (error) {
                    success++;
                    if (error) {
                        console.log(`Delete Product ID ${result.id} Error (${error})`);
                    } else {
                        arr.push(`'${result.id}'`);
                        //console.log(`Delete Serial ${result.id} Success (${success}/${all})`);
                    }
                    if (success >= all) {
                        msg.delete = { success: true, result: arr.toString()};
                        tp.sql(`DELETE FROM Firebase..ProductNew WHERE product IN (${arr.toString()})`).execute();
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
    tp.sql(`EXEC Firebase..sp_ProductNewSyncData 'update'`).execute().then(function (results) {
        let all = results.length;
        if (all > 0) {
            let success = 0;
            let arr = [];
            results.forEach(result => {
                let json = {
                    name: result.name,
                    sku: result.sku,
                    qty: result.qty,
                    newRank: result.newRank,
                    price: result.price,
                    price1: result.price1,
                    price2: result.price2,
                    price3: result.price3,
                    price4: result.price4,
                    price5: result.price5,
                    price6: result.price6,
                    price7: result.price7
                }

                db.ref(`product/TH/0001/new/${result.id}`).update(json, function (error) {
                    success++;
                    if (error) {
                        console.log(`Update Product ID ${result.id} Error (${error})`);
                    } 
                    else {
                        arr.push(`'${result.id}'`);
                        //console.log(`Update Serial ${result.id} Success (${success}/${all})`);
                    }
                    if(success >= all) {
                        msg.update = { success: true, result: arr.toString()};
                        res.send(msg);
                        tp.sql(`UPDATE Firebase..ProductNew SET isSync = 1, syncDate = GETDATE() WHERE product IN (${arr.toString()})`).execute();
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