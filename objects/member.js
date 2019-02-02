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
    tp.sql(`EXEC Firebase..sp_MemberSyncData 'delete'`).execute().then(function (results) {
        let all = results.length;
        if (all > 0) {
            let success = 0;
            let arr = [];
            results.forEach(result => {
                db.ref(`member/info/${result.id}`).remove(function (error) {
                    success++;
                    if (error) {
                        console.log(`Delete Member ID ${result.id} Error (${error})`);
                    } else {
                        arr.push(`'${result.id}'`);
                        //console.log(`Delete Serial ${result.id} Success (${success}/${all})`);
                    }
                    if (success >= all) {
                        msg.delete = { success: true, result: arr.toString()};
                        tp.sql(`DELETE FROM Firebase..Member WHERE id IN (${arr.toString()})`).execute();
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
    tp.sql(`EXEC Firebase..sp_MemberSyncData 'update'`).execute().then(function (results) {
        let all = results.length;
        if (all > 0) {
            let success = 0;
            let arr = [];
            results.forEach(result => {
                let json = {
                    active: result.active,
                    add: {
                        date: result.addDate
                    },
                    displayName: result.firstname != null ? result.firstname : (result.nickname != null ? result.nickname : result.username),
                    email: result.email,
                    firstname: result.firstname,
                    hub: {
                        TH: ["0001"]
                    },
                    lastname: result.lastname,
                    loginCount: result.loginCount,
                    loginDate: result.loginDate,
                    nickname: result.nickname,
                    selected: {
                        country: "TH",
                        hub: "0001",
                        memberType: result.selectedMemberType
                    }
                }
                if(result.gender != null) json.gender = result.gender;
                if(result.mobile != null) json.mobile = result.mobile;
                if(result.updateDate != null) json.updateDate = result.updateDate;
                if(result.updateBy != null) json.updateBy = result.updateBy;

                db.ref(`member/info/${result.id}`).update(json, function (error) {
                    success++;
                    if (error) {
                        console.log(`Update Member ID ${result.id} Error (${error})`);
                    } 
                    else {
                        arr.push(`'${result.id}'`);
                        //console.log(`Update Serial ${result.id} Success (${success}/${all})`);
                    }
                    if(success >= all) {
                        msg.update = { success: true, result: arr.toString()};
                        res.send(msg);
                        tp.sql(`UPDATE Firebase..Member SET isSync = 1, syncDate = GETDATE() WHERE id IN (${arr.toString()})`).execute();
                        console.log(msg.update);
                        return true;
                    }
                });
                
                let username = result.username.toLowerCase().replace(/\$/g, '').replace(/\./g, '').replace(/\#/g, '').replace(/\[/g, '').replace(/\]/g, '');

                db.ref(`member/login/username/${username}`).update({
                    member: result.id,
                    password: result.password
                }, function (error) {});
                
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