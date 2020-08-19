/* API creada para el curso SC-103 Introducción a la Informatica donde se elabora un articulo cientifico sobre Database Caching */

const { Pool, Client } = require('pg')

const pool = new Pool({
  user: 'vultr',
  host: '127.0.0.1',
  database: 'angelcreations',
  password: 'vultr',
  port: 5432,
})

pool.connect();

/* Ejecutar el codigo abajo una vez para crear 10.000 registros de manera aleatoria hacia la tabla de Clientes */

/* Referencia de SQL utilizado para inicializar la base de datos Postgres puede se puede encontrar en el archivo 'Database.sql' */

// const provincia = [{p:'San Jose',c:['San Jose','Guadalupe']},{p:'Alajuela',c:['San Ramon','Centro']}]
// const num_of_mock_clients = 10000

// for(let c = 0; c < num_of_mock_clients; c++){
//     p = provincia[Math.floor(provincia.length * Math.random())]        //Provincia Aleatoria
//     cd = p.c[Math.floor(p.c.length * Math.random())]     //Ciudad Aleatoria basado en la provincia
//     n = `cliente teste #${c}`   //Nombre del cliente
//     pool.query(`INSERT INTO clientes(nombre, fecha_nacimiento, fecha_registro, provincia, ciudad) 
//                              VALUES ('${n}','${new Date().toISOString()}','${new Date().toISOString()}','${p.p}','${cd}')`)
// }
// return;

/* Despues de utilizar el codigo arriba una vez comentarlo otra vez para si no deseas insertar más clientes a la base de datos */

//#region - Cargar y Inicializar modulos necesarios para el API
const Redis = require("ioredis");
const cache = new Redis();

cache.on("error", function(error) {
  console.error(error);
});

const express = require('express')
const app = express()
const port = 2550

//#endregion - Cargar y Inicializar modulos necesarios para el API

//#region - Cargar la tabla de clientes hacia el Cache
pool.query(`SELECT * FROM clientes`, (err, result) => {
    result.rows.forEach((data) => {   //Cargar cada uno de los clientes
        let id = data["id"];
        let save_data = new Object(data)
        delete save_data["id"];

        cache.set(`cliente:${id}`,JSON.stringify(save_data),(err,data) => {

        });  //Cargar informacion del cliente en formato string del objecto JSON obtenido. 

        cache.sadd(`cliente:${save_data["ciudad"]}`,id,(err,data) => {

        });  //Crear y/o agregar a un indice unico para clientes por ciudad.

        save_data = null;
        id = null;
    })
})
//#endregion - Cargar la tabla de clientes hacia el Cache

//#region - API - Consultas

//Desde el cache por un cliente especifico
app.get('/cache_cliente/:id', (req, res) => {
    let t = process.hrtime();
    cache.get(`cliente:${req.params.id}`,(err,result) => {

        let t1 = process.hrtime(t);
        res.send(`${t1[1]/1000000}`);                    
        
    })
})

//Desde la base de datos por un cliente especifico
app.get('/bd_cliente/:id', async (req, res) => {
    let t = process.hrtime();
    let result = await pool.query(`SELECT * FROM clientes WHERE id = ${req.params.id}`)
    let t1 = process.hrtime(t);
    res.send(`${t1[1]/1000000}`);
})

//Desde el cache por todos los clientes en una ciudad
app.get('/cache_ciudad/:ciudad', (req, res) => {
    let t = process.hrtime();
    cache.smembers(`cliente:${req.params.ciudad}`,(err,result) => {
        keys = 0;
        let retrive_pipeline = []
        if(result.length == 0){
            res.send("No Data");
        }
        result.forEach((k) => {
            retrive_pipeline.push(["get",`cliente:${k}`])
            keys += 1;
            if(keys == result.length){
                cache.multi(
                    retrive_pipeline
                ).exec((err, result) => {
                    let t1 = process.hrtime(t);
                    res.send(`${t1[1]/1000000}`);                    
                })
            }
        })
        
    })
})

//Desde la base de datos por todos los clientes en una ciudad
app.get('/bd_ciudad/:ciudad', async (req, res) => {
    let t = process.hrtime();
    let result = await pool.query(`SELECT * FROM clientes WHERE ciudad = '${req.params.ciudad}'`)
    let t1 = process.hrtime(t);
    res.send(`${t1[1]/1000000}`);
})

//#endregion - API - Consultas

//Inicializar API
app.listen(port, () => {
  console.log(`API en http://localhost:${port}`)
})