const Agenda = require('agenda');
const config = require('config');


const agenda = new Agenda({
    db: {
        address: config.get('mongoAgendaURI'),
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true 
        },
    }
});

module.exports = { agenda };