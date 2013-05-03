//server side config

var socketPort = 
    (typeof process !== 'undefined' && 
     typeof process.BAE !== 'undefined') ?
    process.env.APP_PORT : 8012;
var clientSocketServer = typeof location !== 'undefined' ? 
        location.hostname + ':' + socketPort + '/socket/' : '';

sumeru.config({
   httpServerPort: 8081,   
   sumeruPath: '/../../sumeru',
  soketPort: socketPort,
   clientSocketServer : clientSocketServer
});
