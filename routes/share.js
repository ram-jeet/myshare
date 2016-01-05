'use strict';

var util = require('util');
var api = require('../api').share;
var userApi = require('../api/user');
var debug = require('debug')('routes:share');
var APIError = require('../lib').APIError;

var share = {};

share.get = function(req, res, next) {
	var options = {};
	if (req.query && Object.keys(req.query).length) options = req.query;
	api.get(options, function(err, result) {
		if(err) {
			debug(err);
			return next(err || new APIError(403, 'error in fetching shares', 'RT_SG_4001'));
		}
		req.result = result;
		return next();
	});
};

share.summary = function(req, res, next) {
	var options = {};
	if (req.query && Object.keys(req.query).length) options = req.query;
	options.summary = 'amount';
	options.group = 'user_id';
	
	userApi.listing({}, function(err, userResult) {
		if(err) {
			return next(err);
		}
		var userIds = [];
		userResult.forEach(function(user) {
			userIds.push(user.id);
		})
		processNext(userIds);
	});
	
	function processNext(userIds) {
		api.get(options, function(err, result) {
			if(err) {
				debug(err);
				return next(err || new APIError(403, 'error in fetching summary', 'RT_SS_4001'));
			}
			var total = 0;
			var count = userIds && userIds.length;
			var perPerson = 0;
			var share_map = {};
			result.forEach(function(res) {
				total += res.sum;
			});
			perPerson = total /count;
			perPerson = perPerson.toFixed(2);
			userIds.forEach(function(uid) {
				share_map[uid] = {
					user_id: uid,
					sum: 0,
					balance: 0 - perPerson
				}
			});
			result.forEach(function(res) {
				share_map[res.user_id].sum = res.sum;
				share_map[res.user_id].balance += res.sum;
				share_map[res.user_id].balance = (share_map[res.user_id].balance).toFixed(2);
			});
			result = [];
			for(var uid in share_map) {
				result.push(share_map[uid]);
			}
			var response = {
				total: total,
				perPerson: perPerson,
				data: result
			};
			req.result = response;
			return next();
		});
	}
};

share.insert = function(req, res, next) {
	if(!req || !req.body) {
		return next(new APIError(400, 'Invalid Request', 'RT_SI_4000'));
	}
	var input = req.body;
	input.user_id = req.session.user.id;
	api.insert(input, function(err, result) {
		if(err) {
			debug(err);
			return next(err || new APIError(403, 'error in creating share', 'RT_SI_4001'));
		}
		req.result = result;
		return next();
	});
};

share.update = function(req, res, next) {
	if(!req || !req.params) {
		return next(new APIError(400, 'Invalid Request', 'RT_TMD_4000'));
	}
	var input = req.body;
	input.id = req.params['id'];
	api.update(input, function(err, result) {
		if(err) {
			debug(err);
			return next(err || new APIError(403, 'error in updating share', 'RT_SU_4001'));
		}
		req.result = result;
		return next();
	});
};

share.del = function(req, res, next) {
	if(!req || !req.params) {
		return next(new APIError(400, 'Invalid Request', 'RT_TD_4000'));
	}
	var input = {
		id: req.params['id'],
		status: 0	
	};
	api.update(input, function(err, result) {
		if(err) {
			return next(err || new APIError(403, 'error in deleting share', 'RT_SD_4001'));
		}
		req.result = result;
		return next();
	});
};

share.response = function(req, res, next) {
	res.json(req.result);	
};

module.exports = share;