'use strict';

const express = require('express');
const controller = require('../controllers/message.controller');

const router = express.Router();

// Task 2.2 -- schedule a message for a given day + time
router.post('/messages', controller.create);
router.get('/messages', controller.list);
router.get('/messages/:id', controller.getOne);

module.exports = router;
