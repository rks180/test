'use strict';

const express = require('express');
const controller = require('../controllers/policy.controller');

const router = express.Router();

// Task 1.2 -- search policy info by username
router.get('/policies/search', controller.search);

// Task 1.3 -- aggregated policy by each user
router.get('/policies/aggregate', controller.aggregateByUser);

module.exports = router;
