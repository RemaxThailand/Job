exports.firebaseUpdate = function (req, res) {
    updateData(req, res);
};


function updateData(req, res) {
    let msg = {
        delete: {},
        update: {}
    }
    let tp = require('tedious-promises');
    tp.setConnectionConfig(require(`${__dirname}/../../.config/www/mssql.json`));
    tp.sql(`EXEC Firebase..sp_ProductSyncData`).execute().then(function (results) {
        let all = results.length;
        if (all > 0) {
            let success = 0;
            let arr = [];
            results.forEach(result => {
                db.ref(`product/TH/0001/${result.id}`).update({
                    sku: result.sku != null ? result.sku.trim() : result.sku,
                    name: result.name.trim(),
                    costYuan: parseFloat(result.costYuan),
                    category: ''+result.category,
                    brand: ''+result.brand,
                    warranty: parseInt(result.warranty),
                    active: result.active,
                    visible: result.visible,
                    addDate: + new Date(result.addDate),
                    addBy: ''+result.addBy,
                    updateDate: + new Date(result.updateDate),
                    updateBy: ''+result.updateBy
                }, function (error) {
                    success++;
                    if (error) {
                        console.log(`Update ID ${result.id} Error (${error})`);
                    } 
                    else {
                        arr.push(result.id);
                        //console.log(`Update Serial ${result.id} Success (${success}/${all})`);
                    }
                    if(success >= all) {
                        msg.update = { success: true, result: arr.toString()};
                        res.send(msg);
                        tp.sql(`UPDATE Firebase..Product SET isSync = 1, syncDate = GETDATE() WHERE id IN (${arr.toString()})`).execute();
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