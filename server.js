const express = require('express');
const axios = require('axios');
const { Server: IOServer } = require('socket.io');
const { Server: HttpServer } = require('http');
const minimist = require('minimist');
require('dotenv').config();

//------------------------------------------SESSION----------------------------------------//

const session = require('./controllers/middleware/session');
const cookieParser = require('cookie-parser');

//------------------------------------------PASSPORT----------------------------------------//

const { passport, localStrategy } = require('./controllers/middleware/passport');


//------------------------------------------RUTAS----------------------------------------//

const mainView = require('./routes/mainView.js');
const productos = require('./routes/products');
const { productosTest } = require('./routes/productsTest');
const { testView } = require('./routes/productsTest');
const login = require('./routes/login');
const logout = require('./routes/logout');
const register = require('./routes/register');
const info = require('./routes/info');
const random = require('./routes/random');

//---------------------------------------ALMACENAMIENTO----------------------------------//

const Contenedor = require('./DB/contenedores/knexSQL');
const { options } = require('./DB/options/sqlite3');

//------------------------------------------SERVIDOR-------------------------------------//

const app = express();
const httpServer = new HttpServer(app);
const io = new IOServer(httpServer);
const alias = { alias: { p: "puerto" } }
const parsedArgs = minimist(process.argv, alias);
const port = parsedArgs.p || 8080; //requires node server.js -p 8080

//------------------------------------------APP.USE()-------------------------------------//

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser())
app.use(session); //maneja la session de un usuario
app.use(passport.initialize()); //inicializa passport
app.use(passport.session()); //vamos a utilizar session con passport
passport.use(localStrategy)

//Para poder interceptar la página principal sin ser enviado al index.html automáticamente,
//necesito crear una ruta para la página principal Y LUEGO servir los archivos públicos

app.use('/', mainView) //Vista principal
app.use(express.static(__dirname + '/public'));
app.use('/api/productos', productos);
app.use('/api/productos-test', productosTest);
app.use('/test', testView); //Vista de prueba
app.use('/login', login); //Vista de login
app.use('/logout', logout); //Vista de logout
app.use('/register', register); //Vista de logout
app.use('/info', info); //Vista de info
app.use('/api/randoms', random); //Ruta de random

//------------------------------------------RUTAS DE SOCKET--------------------------------//

io.of('/info', socket => {
    console.log('Conectado a /info')
    socket.emit('info');
})

io.of('/register').on('connection', socket => { //Register
    console.log('Conectado a /register')
})

io.of('/logout').on('connection', socket => { //logout
    console.log('Conectado a /logout')
    socket.emit('logout');
})

io.of('/login').on('connection', () => { //Login
    console.log('Conectado a /login');
})

io.of('/test').on('connection', socket => { //test
    console.log('Conectado a /test')
    socket.emit('testing');
})

io.of('/').on('connection', async(socket) => { //ruta principal
    console.log('Conectado a /');
    const messages = new Contenedor('messages', options)

    socket.emit('products');
    socket.emit('messages', await messages.getAll());
    socket.emit('login')

    socket.on('new-product', (products) => {
        axios.post('http://localhost:8080/api/productos', products)
        io.sockets.emit('products')
    })

    socket.on('load-messages', async() => {
        socket.emit('messages', await messages.getAll());
    });

    socket.on('new-message', async(data) => {
        await messages.save(data);
        io.sockets.emit('messages', await messages.getAll())
    })
});

//------------------------------------------CONEXIÓN-------------------------------------//

httpServer.listen(port, () => {
    console.log(`Server listening on port ${port}`);
})