/*
 * @Author: binchem
 * @Date:   2016-04-16 10:05:18
 * @Last Modified by:   able
 * @Last Modified time: 2016-12-08 21:07:54
 */

var defaultConfigs = exports = module.exports = {};

defaultConfigs.db = {

    mysql: {
        adapter: 'mysql',
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'aabbc@11223',
        database: 'yooyet',
        charset: 'utf8',
        multipleStatements: true,
        dateStrings: 'DATETIME',
        supportBigNumbers: true,
        timezone: 'utc',
        connectionLimit: 100,
        queueLimit: 100,
        flags: '-FOUND_ROWS'
    },

    redis: {
        host: 'localhost',
        port: 6379,
        db: 0,
        ttl: 60 * 30,
        password: '',
        prefix: ''
    },

};

defaultConfigs.tmpl = {

    title: "-",

    port: 3000,

    connections: {},

    log: ['http', 'info', 'debug', 'star', 'warn', 'error'],

    view_engine: false, // ejs、pug

    session: false,
    // session: {
    //     secret: 'KqcTI8ThzMNvrIJYrtIEsxn',
    //     resave: false,
    //     saveUninitialized: false,
    //     name: 'fw.sid',
    //     cookie: {
    //         secure: true,
    //         domain: '.yy.local'
    //     },
    //     store: {
    //         host: 'localhost',
    //         port: 6379,
    //         db: 1,
    //         ttl: 300,
    //         pass: '',
    //         prefix: 'sess:'
    //     }
    // },

    // mkdir ssl
    // cd ssl
    // openssl genrsa -des3 -out server.key 1024 # 会提示你输入key，尽可能长些复杂些，后面好几处要用，我都是复制粘贴的
    // openssl req -new -key server.key -out server.csr # 输入组织信息 CN BeiJing HaiDian huozhe.com
    // cp server.key server.key.org
    // openssl rsa -in server.key.org -out server.key 
    // openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt
    // 
    //  ssl: {
    //     ca: 'ssl/cert.csr',
    //     key: 'ssl/key.pem',
    //     cert: 'ssl/cert.pem'
    // },
};
