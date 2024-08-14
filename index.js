const ytdl = require('ytdl-core');
const http = require('http');
const url = require('url');
const NodeCache = require('node-cache');
const express = require('express');
const cors = require('cors');

const cache = new NodeCache();

const hostname = process?.env?.HOST;
const app = express();
const port = 43634;

const successCacheAge = 14400; // 4hrs
const errorCacheAge = 3600; // 1hrs

// Clear cache on restart
if (process.env.CLEAR_CACHE) {
	cache.flushAll();
}

/**
 * Send response headers and data.
 *
 * @param {ServerResponse} response
 * @param {object} data
 */
function sendResponse(response, data) {
	response.setHeader('Access-Control-Allow-Origin', '*');
	response.setHeader('Access-Control-Allow-Methods', 'GET');

	response.setHeader('Content-Type', 'application/json');
	response.end(JSON.stringify(data));
}

/**
 * Send a successful response.
 *
 * @param {ServerResponse} response
 * @param {*} data
 */
function sendSuccess(response, data) {
	sendResponse(response, {
		success: true,
		data
	});
}

/**
 * Send a failed response.
 *
 * @param {ServerResponse} response
 * @param {*} data
 */
function sendError(response, data) {
	sendResponse(response, {
		success: false,
		data
	});
}

/**
 * Initiate our server instance.
 *
 * @type {Server} app
 */
// Enable CORS for a specific origin
const allowedOrigins = [
	"http://localhost:4200",
	"http://localhost:4201",
	"http://localhost",
	"https://localhost",
	"ionic://localhost",
	"capacitor://localhost",
	"http://localhost:44450",
	"http://127.0.0.1:3000",
	"http://127.0.0.1:5501",
	"https://notepad.metalearn.vn",
	"https://ionic.metalearn.vn",
	"https://do.metalearn.vn",
];

const corsOptions = {
	origin: function (origin, callback) {
		// Check if the origin is in the allowedOrigins array or if it's undefined (e.g., from a non-browser client)
		if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
			callback(null, true);
		} else {
			callback(new Error('Not allowed by CORS'));
		}
	}
};

// Enable CORS with custom options
app.use(cors(corsOptions));

app.get('/', (req, res) => {
	console.log('get query');
	const queryObject = url.parse(req.url, true).query;
	const idParam = queryObject?.id;
	const urlParam = queryObject?.url;

	if (!idParam && !urlParam) {
		sendError(res, 'Missing `url` or `id` parameter.');
	} else {
		const youtubeUrl = idParam ? `https://www.youtube.com/watch?v=${idParam}` : urlParam;
		const cacheValue = cache.get(youtubeUrl);

		if (cacheValue) {
			if (Object.keys(cacheValue).length === 0 && cacheValue.constructor === Object || cacheValue.statusCode) {
				sendError(res, cacheValue);
			} else {
				sendSuccess(res, cacheValue);
			}
		} else {
			ytdl.getInfo(youtubeUrl)
				.then(data => {
					cache.set(youtubeUrl, data, successCacheAge);
					sendSuccess(res, data);
				})
				.catch(error => {
					cache.set(youtubeUrl, error, errorCacheAge);
					sendError(res, error);
				});
		}
	}
});

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
