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
    tp.sql(`EXEC Firebase..sp_MemberMappingSyncData 'delete'`).execute().then(function (results) {
        let all = results.length;
        if (all > 0) {
            let success = 0;
            let arr = [];
            results.forEach(result => {
                db.ref(`member/info/${result.id}/memberType/${result.memberType}`).remove(function (error) {
                    success++;
                    if (error) {
                        console.log(`Delete Member ID ${result.id} (${result.memberType}) Error (${error})`);
                    } else {
                        arr.push(`'${result.id}${result.memberType}'`);
                        //console.log(`Delete Serial ${result.id} Success (${success}/${all})`);
                    }
                    if (success >= all) {
                        msg.delete = { success: true, result: arr.toString()};
                        tp.sql(`DELETE FROM Firebase..MemberMapping WHERE member+memberType IN (${arr.toString()})`).execute();
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
    tp.sql(`EXEC Firebase..sp_MemberMappingSyncData 'update'`).execute().then(function (results) {
        let all = results.length;
        if (all > 0) {
            let success = 0;
            let arr = [];
            results.forEach(result => {
                let json = {
                    payShipping: result.payShipping,
                    sellPrice: result.sellPrice
                }
                if (result.headSale != null) json.headSale = {
                    expire: result.headSaleExpire,
                    id: result.headSale,
                    mapping: result.headSaleMapping
                };
                if (result.manager != null) json.manager = {
                    expire: result.managerExpire,
                    id: result.manager,
                    mapping: result.managerMapping
                };
                if (result.sellDiscount != null && result.sellDiscount > 0) json.sellDiscount = result.sellDiscount;

                db.ref(`member/info/${result.id}/memberType/${result.memberType}`).update(json, function (error) {
                    success++;
                    if (error) {
                        console.log(`Update Member ID ${result.id} (${result.memberType}) Error (${error})`);
                    } else {
                        arr.push(`'${result.id}${result.memberType}'`);
                        //console.log(`Update Serial ${result.id} Success (${success}/${all})`);
                    }
                    if(success >= all) {
                        msg.update = { success: true, result: arr.toString()};
                        res.send(msg);
                        tp.sql(`UPDATE Firebase..MemberMapping SET isSync = 1, syncDate = GETDATE() WHERE member+memberType IN (${arr.toString()})`).execute();
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