exports.firebaseUpdate = function (req, res) {
    let listType = ['hour', 'weekDay', 'day', 'month'];
    let msg = {
        delete: { hour: {}, weekDay: {}, day: {}, month: {} },
        update: { hour: {}, weekDay: {}, day: {}, month: {} },
        deleteAging: {},
        updateAging: {}
    }

    if(typeof db2 === 'undefined'){
        const admin = require('firebase-admin');
        var secondary = admin.initializeApp({
            credential: admin.credential.cert(require(`${__dirname}/../../.config/www/credential-powerbolt-shop.json`)),
            databaseURL: 'https://powerbolt-shop.firebaseio.com'
        }, "secondary");
        global.db2 = secondary.database(); 
    }

    deleteData(req, res, listType, msg);
};

function deleteData(req, res, listType, msg) {
    let tp = require('tedious-promises');
    tp.setConnectionConfig(require(`${__dirname}/../../.config/www/mssql.json`));
    tp.sql(`EXEC Firebase..sp_ShopSellSyncData 'delete', '${listType[0]}'`).execute().then(function (results) {
        let all = results.length;
        let typeWord = listType[0].charAt(0).toUpperCase()+listType[0].slice(1);
        if (all > 0) {
            let success = 0;
            let arr = [];
            results.forEach(result => {

                db2.ref(`shop/info/${result.shop}/report/sell/${result.sellYear}/${result.sellMonth}/${listType[0]}${listType[0] != 'month' ? `/${result['sell'+typeWord]}` : ''}`).remove(function (error) {
                    success++;
                    if (error) {
                        console.log(`Delete Shop ${result.shop} (${result.sellYear}/${result.sellMonth}/${listType[0]}/${result['sell'+typeWord]}) Error (${error})`);
                    } else {
                        arr.push(`'${result.shop}${result.sellYear}${result.sellMonth}${listType[0] != 'month' ? `${result['sell'+typeWord]}` : ''}'`);
                        //console.log(`Delete Shop ${result.shop} (${result.sellYear}/${result.sellMonth}/${listType[0]}/${result['sell'+typeWord]}) Success (${success}/${all})`);
                    }
                    if (success >= all) {
                        msg.delete[listType[0]] = { success: true, result: arr.toString()};
                        tp.sql(`DELETE FROM Firebase..ShopSell${typeWord} WHERE shop+sellYear+sellMonth${listType[0] != 'month' ? `+sell${typeWord}` : ''} IN (${arr.toString()})`).execute();
                        //console.log(msg.delete[listType[0]]);
                        setTimeout(function () {
                            updateData(req, res, listType, msg);
                        }, 1000);
                    }
                })
            });
        } else {
            msg.delete[listType[0]] = 'No Delete Data';
            //console.log(`No data for delete (${typeWord})`);
            updateData(req, res, listType, msg);
        }
    }).fail(function (err) {
        msg.delete[listType[0]] = err;
        //console.log(err);
        updateData(req, res, listType, msg);
    });
}


function updateData(req, res, listType, msg) {
    let tp = require('tedious-promises');
    tp.setConnectionConfig(require(`${__dirname}/../../.config/www/mssql.json`));
    tp.sql(`EXEC Firebase..sp_ShopSellSyncData 'update', '${listType[0]}'`).execute().then(function (results) {
        let all = results.length;
        let typeWord = listType[0].charAt(0).toUpperCase()+listType[0].slice(1);
        if (all > 0) {
            let success = 0;
            let arr = [];
            results.forEach(result => {
                    
                let json = {
                    sell: result.sell,
                    cost: result.cost,
                    bill: result.bill,
                    male: result.male,
                    female: result.female
                }

                if(listType[0] == 'month'){
                    json.startBill = result.startBill;
                    json.endBill = result.endBill;
                    json.returnCount = result.returnCount;
                    json.checkStockCount = result.checkStockCount;
                    json.repeatBuy = result.repeatBuy;
                }

                db2.ref(`shop/info/${result.shop}/report/sell/${result.sellYear}/${result.sellMonth}/${listType[0]}${listType[0] != 'month' ? `/${result['sell'+typeWord]}` : ''}`)
                    .update(json, function (error) {
                    success++;
                    if (error) {
                        console.log(`Update Shop ${result.shop} (${result.sellYear}/${result.sellMonth}/${listType[0]}/${result['sell'+typeWord]}) Error (${error})`);
                    } else {
                        arr.push(`'${result.shop}${result.sellYear}${result.sellMonth}${listType[0] != 'month' ? `${result['sell'+typeWord]}` : ''}'`);
                        //console.log(`Update Shop ${result.shop} (${result.sellYear}/${result.sellMonth}/${listType[0]}/${result['sell'+typeWord]}) Success (${success}/${all})`);
                    }
                    if(success >= all) {
                        msg.update[listType[0]] = { success: true, result: arr.toString()};
                        tp.sql(`UPDATE Firebase..ShopSell${typeWord} SET isSync = 1, syncDate = GETDATE() WHERE shop+sellYear+sellMonth${listType[0] != 'month' ? `+sell${typeWord}` : ''} IN (${arr.toString()})`).execute();
                        //console.log(`Success update (${typeWord})\n`);
                        checkTask(req, res, listType, msg);
                    }
                })
            });
        } else {
            msg.update[listType[0]] = `No data for update (${typeWord})`;
            //console.log(`No data for update (${typeWord})`);
            checkTask(req, res, listType, msg);
        }
    }).fail(function (err) {
        msg.update[listType[0]] = err;
        //console.log(err);
        checkTask(req, res, listType, msg);
    });
}

function checkTask(req, res, listType, msg){
    listType = listType.splice(1);
    if(listType.length > 0) {
        deleteData(req, res, listType, msg)
    }
    else {
        deleteAgingData(req, res, msg);
    }
}

function deleteAgingData(req, res, msg) {
    let tp = require('tedious-promises');
    tp.setConnectionConfig(require(`${__dirname}/../../.config/www/mssql.json`));
    tp.sql(`EXEC Firebase..sp_ShopSellSyncData 'delete', 'costAging'`).execute().then(function (results) {
        let all = results.length;
        if (all > 0) {
            let success = 0;
            let arr = [];
            results.forEach(result => {
                db2.ref(`shop/info/${result.shop}/report/aging`).remove(function (error) {
                    success++;
                    if (error) {
                        console.log(`Delete Aging Shop ${result.shop} Error (${error})`);
                    } else {
                        arr.push(`'${result.shop}`);
                        //console.log(`Delete Aging Shop ${result.shop} Success (${success}/${all})`);
                    }
                    if (success >= all) {
                        msg.deleteAging = { success: true, result: arr.toString()};
                        tp.sql(`DELETE FROM Firebase..ShopCostAging WHERE shop IN (${arr.toString()})`).execute();
                        //console.log(msg.deleteAging);
                        setTimeout(function () {
                            updateAgingData(req, res, msg);
                        }, 1000);
                    }
                })
            });
        } else {
            msg.deleteAging = `No data for delete (Aging)`;
            //console.log(`No data for delete (Aging)`);
            updateAgingData(req, res, msg);
        }
    }).fail(function (err) {
        msg.deleteAging = err;
        //console.log(err);
        updateAgingData(req, res, msg);
    });
}


function updateAgingData(req, res, msg) {
    let tp = require('tedious-promises');
    tp.setConnectionConfig(require(`${__dirname}/../../.config/www/mssql.json`));
    tp.sql(`EXEC Firebase..sp_ShopSellSyncData 'update', 'costAging'`).execute().then(function (results) {
        let all = results.length;
        if (all > 0) {
            let success = 0;
            let arr = [];
            results.forEach(result => {
                    
                let json = {
                    cost90: result.cost90,
                    cost60: result.cost60,
                    cost30: result.cost30,
                    cost15: result.cost15,
                    cost0: result.cost0,
                    inNew: result.inNew,
                    inTopRank: result.inTopRank
                }

                db2.ref(`shop/info/${result.shop}/report/aging`).update(json, function (error) {
                    success++;
                    if (error) {
                        console.log(`Update Aging Shop ${result.shop} Error (${error})`);
                    } else {
                        arr.push(`'${result.shop}'`);
                        //console.log(`Update Aging Shop ${result.shop} Success (${success}/${all})`);
                    }
                    if(success >= all) {
                        msg.updateAging = { success: true, result: arr.toString()};
                        res.send(msg);
                        tp.sql(`UPDATE Firebase..ShopCostAging SET isSync = 1, syncDate = GETDATE() WHERE shop IN (${arr.toString()})`).execute();
                        //console.log(`Success update (Aging)\n`);
                        return true;
                    }
                })
            });
        } else {
            msg.updateAging = `No data for update (Aging)`;
            res.send(msg);
            //console.log(`No data for update (Aging)`);
            return true;
        }
    }).fail(function (err) {
        msg.updateAging = err;
        res.send(msg);
        //console.log(err);
        return true;
    });
}