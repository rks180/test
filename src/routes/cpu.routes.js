'use strict';

const express = require('express');
const controller = require('../controllers/cpu.controller');

const router = express.Router();

router.get('/cpu', controller.cpu);
router.post('/cpu/stress', controller.stress);

module.exports = router;
