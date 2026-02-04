const express = require('express');
const path = require('path');
const cors = require('cors'); 
const routes = require('./routes/index');

class App {
  constructor() {
    this.server = express();
    this.server.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    this.server.use(express.json({ limit: '50mb' }));
    this.server.use(express.urlencoded({ limit: '50mb', extended: true }));

    this.middlewares();
    this.routes();
  }

  middlewares() {
    const uploadsPath = path.resolve(__dirname, '..', 'uploads');
    this.server.use('/uploads', express.static(uploadsPath));
  }

  routes() {
    this.server.use(routes);
  }
}

module.exports = new App().server;