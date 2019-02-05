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
    tp.sql(`EXEC Firebase..sp_ShopSellTodaySyncData 'delete'`).execute().then(function (results) {
        let all = results.length;
        if (all > 0) {
            let success = 0;
            let arr = [];
            results.forEach(result => {
                db2.ref(`shop/info/${result.shop}/report/sell/${now.getFullYear()}/${now.getMonth()+1}/day/${now.getDate()}/sell`).remove(function (error) {
                    success++;
                    if (error) {
                        console.log(`Delete Shop ${result.shop} Error (${error})`);
                    } 
                    else {
                        arr.push(`'${result.shop}'`);
                        //console.log(`Delete Serial ${result.id} Success (${success}/${all})`);
                    }
                    if (success >= all) {
                        msg.delete = { success: true, result: arr.toString()};
                        tp.sql(`DELETE FROM Firebase..ShopSellToday WHERE shop IN (${arr.toString()})`).execute();
                        //console.log(msg.delete);
                        setTimeout(function () {
                            updateData(req, res, msg);
                        }, 1000);
                    }
                })
            });
        } else {
            msg.delete = 'No Delete Data';
            //console.log(msg.delete);
            updateData(req, res, msg);
        }
    }).fail(function (err) {
        msg.delete = err;
        //console.log(msg.delete);
        updateData(req, res, msg);
    });
}


function updateData(req, res, msg) {
    let tp = require('tedious-promises');
    tp.setConnectionConfig(require(`${__dirname}/../../.config/www/mssql.json`));
    tp.sql(`EXEC Firebase..sp_ShopSellTodaySyncData 'update'`).execute().then(function (results) {
        let all = results.length;
        if (all > 0) {
            let success = 0;
            let arr = [];
            let now = new Date();
            results.forEach(result => {
                //console.log(`shop/info/${result.shop}/report/sell/${now.getFullYear()}/${now.getMonth()+1}/day/${now.getDate()}/sell = ${result.sell}`);
                db2.ref(`shop/info/${result.shop}/report/sell/${now.getFullYear()}/${now.getMonth()+1}/day/${now.getDate()}/sell`).set(
                    result.sell
                , function (error) {
                    success++;
                    if (error) {
                        console.log(`Update Shop ${result.shop} Error (${error})`);
                    } 
                    else {
                        arr.push(`'${result.shop}'`);
                        //console.log(`Update Serial ${result.id} Success (${success}/${all})`);
                    }
                    if(success >= all) {
                        msg.update = { success: true, result: arr.toString()};
                        res.send(msg);
                        tp.sql(`UPDATE Firebase..ShopSellToday SET isSync = 1, syncDate = GETDATE() WHERE shop IN (${arr.toString()})`).execute();
                        //console.log(msg.update);
                        return true;
                    }
                })
            });
        } else {
            msg.update = 'No Update Data';
            res.send(msg);
            //console.log(msg.update);
            return true;
        }
    }).fail(function (err) {
        msg.update = err;
        res.send(msg);
        //console.log(msg.update);
        return true;
    });
}