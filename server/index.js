'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');

//DATABASE HANDLERS
const { 
  // getUserProfile, 
  createUserProfile, 
  getLastVector,
  newLastVector,
  syncAllBalloons,
  startConversation,
  sendNewMessage, 
} = require('./databaseHandlers');

//API HANDLERS//
const { 
  getConditions, 
  getNearestCity, 
} = require('./apiHandlers');

const PORT = 8000;

express()
  .use(function(req, res, next) {
    res.header(
      'Access-Control-Allow-Methods',
      'OPTIONS, HEAD, GET, PUT, POST, DELETE'
    );
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept'
    );
    next();
  })
  // present by default
  .use(morgan('tiny'))
  .use(express.static('./server/assets'))
  .use(bodyParser.json())
  .use(express.urlencoded({ extended: false }))
  .use('/', express.static(__dirname + '/'))

  // don't need a sign in as googleSignIn is a method in firebase(unless you build your own)
  // endpoints
//USER ENDPOINTS
  // .get('/getuser', getUserProfile)
  .post('/createuser', createUserProfile)
//USER VECTOR ENDPOINTS
  .get('/getLastVector/:userId', getLastVector)
  .put('/newLastVector', newLastVector)
//GLOBALLY ACCESSIBLE LOCATION ENDPOINTS
  .post('/syncAllBalloons', syncAllBalloons)
//VICINITY ENDPOINTS
  .post('/api/conditions', getConditions)
  .post('/api/nearest', getNearestCity)
//CHAT ENDPOINTS
  .post('/newChatMessage', sendNewMessage)
  .post('/startConversation', startConversation)




  .listen(PORT, () => console.info(`Listening on port ${PORT}`));
