exports.toMssql = function (req, res) {
    serialMapping(req, res);
}

function serialMapping(req, res) {
    let task = 0;
    let msg = {
        serialMapping: {},
        boxMapping: {},
        addBox: []
    }
    
    let tp = require('tedious-promises');
    tp.setConnectionConfig(require(`${__dirname}/../../.config/www/mssql.json`));
    
    db.ref(`job/mssql/serial/TH/0001/box`).limitToFirst(5000).once('value', function (snapshot) {
        if (snapshot.val() != null) {
            let json = snapshot.val();
            let keys = Object.keys(json);
            task += keys.length;
            console.log(`job/mssql/serial/TH/0001/box = ${task}`);
            keys.forEach(key => {
    
                let cmd = `EXEC Firebase..sp_SerialUpdate '${key}', '${json[key].info.box != '' ? json[key].info.box : ''}', '${json[key].info.mapping != undefined && json[key].info.mapping.by != undefined ? json[key].info.mapping.by : ''}'`
                msg.serialMapping[key] = json[key].info.box;

                //console.log(cmd);
                tp.sql(cmd).execute()
                    .then(function (results) {
                        //console.log(`Update Serial > ${key} = '${json[key].info.box}'`);
                        db.ref(`job/mssql/serial/TH/0001/box/${key}`).remove();
                        task--;
                        if (task <= 0) boxMapping(req, res, task, msg);
                    }).fail(function (err) {
                        console.log(`Error Update Serial > ${key} = '${json[key].info.box}'`);
                        console.error(err);
                        task--;
                        if (task <= 0) boxMapping(req, res, task, msg);
                    });
            });
        } else {
            msg.serialMapping = 'No Serial Data';
            console.log('No Serial Data');
            boxMapping(req, res, task, msg);
        }
    });
}

function boxMapping(req, res, task, msg) {
    let tp = require('tedious-promises');
    tp.setConnectionConfig(require(`${__dirname}/../../.config/www/mssql.json`));

    db.ref(`job/mssql/box/TH/0001/location`).limitToFirst(1000).once('value', function (snapshot) {
        if (snapshot.val() != null) {
            let json = snapshot.val();
            let keys = Object.keys(json);
            task += keys.length;
            console.log(`job/mssql/box/TH/0001/location = ${task}`);
            keys.forEach(key => {
    
                //let cmd = `EXEC Firebase..sp_SerialUpdate '${key}', '${json[key].info.box != '' ? json[key].info.box : ''}', '${json[key].info.mapping != undefined && json[key].info.mapping.by != undefined ? json[key].info.mapping.by : ''}'`
                let cmd = `EXEC Firebase..sp_BoxUpdate '${key}', '${json[key].info.location != '' && json[key].info.location != null ? json[key].info.location : ''}', '${json[key].info.mapping != undefined && json[key].info.mapping.by != undefined ? json[key].info.mapping.by : ''}'`
                msg.boxMapping[key] = json[key].info.location;

                tp.sql(cmd).execute()
                    .then(function (results) {
                        console.log(`Update Box > ${key} = '${json[key].info.location}'`);
                        db.ref(`job/mssql/box/TH/0001/location/${key}`).remove();
                        task--;
                        if (task <= 0) addBox(req, res, task, msg);
                    }).fail(function (err) {
                        console.log(`Error Update Box > ${key} = '${json[key].info.location}'`);
                        console.error(err);
                        task--;
                        if (task <= 0) addBox(req, res, task, msg);
                    });
            });
        } else {
            msg.boxMapping = 'No Box Data';
            console.log('No Box Data');
            addBox(req, res, task, msg);
        }
    });
}

function addBox(req, res, task, msg) {
    let tp = require('tedious-promises');
    tp.setConnectionConfig(require(`${__dirname}/../../.config/www/mssql.json`));
    
    db.ref(`job/mssql/box`).limitToFirst(1000).once('value', function (snapshot) {
        if (snapshot.val() != null) {
            let json = snapshot.val();
            let keys = Object.keys(json);
            task += keys.length;
            console.log(`job/mssql/box = ${task}`);
            keys.forEach(key => {
                msg.addBox.push(key);
                if (json[key].add != undefined) {
                    let cmd = json[key].add.command;
                    tp.sql(cmd).execute()
                        .then(function (results) {
                            console.log(`Add box > ${key}`);
                            db.ref(`job/mssql/box/${key}`).remove();
                            task--;
                            if (task <= 0) checkTask(req, res, task, msg);
                        }).fail(function (err) {
                            console.log(`Error add box > ${key}`);
                            db.ref(`job/mssql/box/${key}`).remove();
                            task--;
                            if (task <= 0) checkTask(req, res, task, msg);
                            //console.error(err);
                        });
                }
            });
        } else {
            msg.addBox = 'No New Box Data';
            console.log('No New Box Data');
            checkTask(req, res, task, msg);
        }
    });
}

function checkTask(req, res, task, msg) {
    if (task <= 0) {
        res.send(msg);
        setTimeout(function () {
            //process.exit(1);
            return 0;
        }, 5000);
    }
}