module.exports = {

    title: "-",

    port: 3000,

    connections: {
        // maindb: {
        //     adapter: 'mysql',
        //     host: 'localhost',
        //     port: 3306,
        //     user: 'root',
        //     password: 'aabbc@11223',
        //     database: 'yy'
        // },
    },

    // cache_redis: {
    //     host: 'localhost',
    //     port: 6379,
    //     db: 0,
    //     // password: '',
    //     prefix: 'CACHE:'
    // },

    log: ['http', 'info', 'debug', 'star', 'warn', 'error'],

    view_engine: 'pug', // false、ejs、pug

    // session: {
    //     secret: 'KqcTI8ThzMNvrIJYrtIEsxn',
    //     resave: false,
    //     saveUninitialized: false,
    //     name: 'fw.sid',
    //     cookie: {
    //         // domain: '.yy.local'
    //     },
    //     // store: {
    //     //     host: 'localhost',
    //     //     port: 6379,
    //     //     db: 1,
    //     //     ttl: 300,
    //     //     pass: '',
    //     //     prefix: 'sess:'
    //     // }
    // },

    // 1,openssl genrsa -out key.pem
    // 2,openssl req -new -key key.pem -out cert.csr
    // 3,openssl x509 -req -in cert.csr -signkey key.pem -out cert.pem
    // 
    //  ssl: {
    //     ca: 'ssl/cert.csr',
    //     key: 'ssl/key.pem',
    //     cert: 'ssl/cert.pem'
    // },
};
