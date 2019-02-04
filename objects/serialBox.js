exports.toMssql = function (req, res) {
    let task = 0;
    let msg = {
        serialMapping: {},
        boxMapping: {},
        addBox: []
    }

    db.ref(`job/mssql/box/TH/0001/location`).limitToFirst(1000).once('value', function (snapshot) {
        if (snapshot.val() != null) {
            let json = snapshot.val();
            let keys = Object.keys(json);
            task += keys.length;
            keys.forEach(key => {
    
                //let cmd = `EXEC Firebase..sp_SerialUpdate '${key}', '${json[key].info.box != '' ? json[key].info.box : ''}', '${json[key].info.mapping != undefined && json[key].info.mapping.by != undefined ? json[key].info.mapping.by : ''}'`
                let cmd = `EXEC Firebase..sp_BoxUpdate '${key}', '${json[key].info.location != '' && json[key].info.location != null ? json[key].info.location : ''}', '${json[key].info.mapping != undefined && json[key].info.mapping.by != undefined ? json[key].info.mapping.by : ''}'`
    
                tp.sql(cmd).execute()
                    .then(function (results) {
                        //console.log(`Update Box > ${key} = '${json[key].info.location}'`);
                        msg.boxMapping[key] = json[key].info.location;
                        db.ref(`job/mssql/box/TH/0001/location/${key}`).remove();
                        task--;
                        checkTask(req, res, task, msg);
                    }).fail(function (err) {
                        console.log(`Error Update Box > ${key} = '${json[key].info.location}'`);
                        console.error(err);
                        task--;
                        checkTask(req, res, task, msg);
                    });
            });
        } else {
            msg.boxMapping = 'No Box Data';
            //console.log('No Box Data');
            checkTask(req, res, task, msg);
        }
    });
    
    
    db.ref(`job/mssql/serial/TH/0001/box`).limitToFirst(5000).once('value', function (snapshot) {
        if (snapshot.val() != null) {
            let json = snapshot.val();
            let keys = Object.keys(json);
            task += keys.length;
            keys.forEach(key => {
    
                let cmd = `EXEC Firebase..sp_SerialUpdate '${key}', '${json[key].info.box != '' ? json[key].info.box : ''}', '${json[key].info.mapping != undefined && json[key].info.mapping.by != undefined ? json[key].info.mapping.by : ''}'`
    
                //console.log(cmd);
                tp.sql(cmd).execute()
                    .then(function (results) {
                        //console.log(`Update Serial > ${key} = '${json[key].info.box}'`);
                        msg.serialMapping[key] = json[key].info.box;
                        db.ref(`job/mssql/serial/TH/0001/box/${key}`).remove();
                        task--;
                        checkTask(req, res, task, msg);
                    }).fail(function (err) {
                        console.log(`Error Update Serial > ${key} = '${json[key].info.box}'`);
                        console.error(err);
                        task--;
                        checkTask(req, res, task, msg);
                    });
            });
        } else {
            msg.serialMapping = 'No Serial Data';
            //console.log('No Serial Data');
            checkTask(req, res, task, msg);
        }
    });
    
    db.ref(`job/mssql/box`).limitToFirst(1000).once('value', function (snapshot) {
        if (snapshot.val() != null) {
            let json = snapshot.val();
            let keys = Object.keys(json);
            task += keys.length;
            keys.forEach(key => {
                if (json[key].add != undefined) {
                    let cmd = json[key].add.command;
                    tp.sql(cmd).execute()
                        .then(function (results) {
                            //console.log(`Add box > ${key}`);
                            msg.addBox.push(key);
                            db.ref(`job/mssql/box/${key}`).remove();
                            task--;
                            checkTask(req, res, task, msg);
                        }).fail(function (err) {
                            console.log(`Error add box > ${key}`);
                            db.ref(`job/mssql/box/${key}`).remove();
                            task--;
                            checkTask(req, res, task, msg);
                            //console.error(err);
                        });
                }
            });
        } else {
            msg.serialMapping = 'No New Box Data';
            //console.log('No New Box Data');
            checkTask(req, res, task, msg);
        }
    });

};

function checkTask(req, res, task, msg) {
    if (task <= 0) {
        res.send(msg);
        /*setTimeout(function () {
            process.exit(1);
        }, 5000);*/
    }
}