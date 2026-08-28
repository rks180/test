'use strict';

const express = require('express');
const statsController = require('../controllers/stats.controller');
const browseController = require('../controllers/browse.controller');

const router = express.Router();

router.get('/stats', statsController.stats);
router.get('/data/:collection', browseController.browse);

module.exports = router;
