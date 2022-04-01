import fs from "fs";
import readline from "readline";
import { google } from "googleapis";

var OAuth2 = google.auth.OAuth2;

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json
var SCOPES = ["https://www.googleapis.com/auth/youtube.upload"];
var TOKEN_DIR =
	(process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) +
	"/.credentials/";
var TOKEN_PATH = TOKEN_DIR + "weather-forecaster-upload.json";

// Load client secrets from a local file.
fs.readFile(
	"./client_secret.json",
	function processClientSecrets(err, content) {
		if (err) {
			console.log("Error loading client secret file: " + err);
			return;
		}
		// Authorize a client with the loaded credentials, then call the YouTube API.
		authorize(JSON.parse(content), uploadVideo);
	}
);

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
	var clientSecret = credentials.web.client_secret;
	var clientId = credentials.web.client_id;
	var redirectUrl = credentials.web.redirect_uris[0];
	var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

	// Check if we have previously stored a token.
	fs.readFile(TOKEN_PATH, function (err, token) {
		if (err) {
			getNewToken(oauth2Client, callback);
		} else {
			oauth2Client.credentials = JSON.parse(token);
			callback(oauth2Client);
		}
	});
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
	var authUrl = oauth2Client.generateAuthUrl({
		access_type: "offline",
		scope: SCOPES,
	});
	console.log("Authorize this app by visiting this url: ", authUrl);
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	rl.question("Enter the code from that page here: ", function (code) {
		rl.close();
		oauth2Client.getToken(code, function (err, token) {
			if (err) {
				console.log("Error while trying to retrieve access token", err);
				return;
			}
			oauth2Client.credentials = token;
			storeToken(token);
			callback(oauth2Client);
		});
	});
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
	try {
		fs.mkdirSync(TOKEN_DIR);
	} catch (err) {
		if (err.code != "EEXIST") {
			throw err;
		}
	}
	fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
		if (err) throw err;
		console.log("Token stored to " + TOKEN_PATH);
	});
}

/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function uploadVideo(auth) {
	var youtube = google.youtube("v3");

	var video = process.argv[2];

	const curDate = new Date(Date.now() + 3600 * 1000 * 24);
	const dateStr = curDate.toLocaleDateString(undefined, {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	if (video) {
		youtube.videos.insert(
			{
				auth: auth,
				requestBody: {
					snippet: {
						title: `UK Weather Forecast - ${dateStr}`,
						description: `This is a Weather Forecast for the UK for ${dateStr} generated automatically. Created by Jack Humphries (https://jackhumphries.io)`,
					},
					status: {
						privacyStatus: "private",
					},
				},

				// This is for the callback function
				part: "snippet,status",

				// Create the readable stream to upload the video
				media: {
					body: fs.createReadStream(video),
				},
			},
			(err, data) => {
				console.log("Done.");
				console.error(err);
				process.exit();
			}
		);
	} else {
		console.error("Video was not provided");
		process.exit();
	}
}
