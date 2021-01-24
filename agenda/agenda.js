const Agenda = require('agenda');
const config = require('config');


const agenda = new Agenda({
    db: {
        address: config.get('mongoAgendaURI'),
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true
        },
    },
},
    function (err) {
        if (err) {
            console.log(err);
            throw err;
        }
        agenda.emit('ready');
        agenda.cancel({ nextRunAt: null }, function (err, numRemoved) {
            console.log(err);
            console.log(numRemoved);
        });
    });

module.exports = { agenda };