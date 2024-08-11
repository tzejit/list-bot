import { handleCallback } from './callback.ts';
import { sendMessage } from './telegramApi.ts';
import { Database, ListId } from './mongodb.ts'
import { Cuisine, generateInputData, InputData, NearbyType, UserFields } from './models.ts';
import { camelCase, generateInlineKeyboardMarkup, locationViewParser } from './utils.ts';
import { getDirection, getNearby } from './locationServices.ts';
import { cuisineText, directionGetLocText, directionMrtText, directionText, nearbyGetLocText, nearbyMrtText, nearbyText } from './consts.ts';
import jsonData from './data.json' assert { type: 'json' };
import { MrtData } from './onemapApi.ts';
import fuzzysort from 'fuzzysort'

export default {
	async fetch(request, env) {
		try {
			if (request.method !== "POST") {
				return new Response();
			}

			const payload = await request.json()
			const db = new Database(env.MONGO_ID, env.DATA_KEY)
			await db.initConnection()

			if ('callback_query' in payload) {
				await handleCallback(payload, env.API_KEY, db)
				return new Response()
			}

			// await sendMessage(payload.message.chat.id, JSON.stringify(payload), env.API_KEY)


			if (!payload.message) {
				return new Response()
			}

			if ("reply_to_message" in payload.message) {
				const chatId = payload.message.chat.id
				const replyText = payload.message.reply_to_message.text

				if ('location' in payload.message) {
					const lat = Number(payload.message.location.latitude)
					const lon = Number(payload.message.location.longitude)
					if (replyText.includes(nearbyGetLocText)) {
						const reply = replyText.split(" ")
						let threshold = 999999999
						if (!isNaN(Number(reply[reply.length - 1].replace("m", '')))) {
							threshold = Number(reply[reply.length - 1].replace("m", ''))
						}
						await getNearby(chatId, threshold, lat, lon, env.API_KEY, db)
					} else if (replyText.includes(directionGetLocText)) {
						const reply = replyText.split(" ")
						const index = Number(reply[reply.length - 1])
						await getDirection(chatId, index, lat, lon, env.API_KEY, db, env.ONEMAP_EMAIL, env.ONEMAP_PW)

					}
				} else {
					if (replyText.includes(nearbyMrtText)) {
						const reply = replyText.split(" ")
						let threshold = 999999999
						if (!isNaN(Number(reply[reply.length - 1].replace("m", '')))) {
							threshold = Number(reply[reply.length - 1].replace("m", ''))
						}
						const station = payload.message.text
						const mrtData: MrtData[] = jsonData
						const chosenStation = fuzzysort.go(station, mrtData, { key: 'SEARCHVAL', limit: 1 })[0].obj
						await getNearby(chatId, threshold, Number(chosenStation.LATITUDE), Number(chosenStation.LONGITUDE), env.API_KEY, db, camelCase(chosenStation.SEARCHVAL.split(" (")[0]))
					} else if (replyText.includes(directionMrtText)) {
						const reply = replyText.split(" ")
						const index = Number(reply[reply.length - 1])
						const station = payload.message.text
						const mrtData: MrtData[] = jsonData
						const chosenStation = fuzzysort.go(station, mrtData, { key: 'SEARCHVAL', limit: 1 })[0].obj
						await getDirection(chatId, index, Number(chosenStation.LATITUDE), Number(chosenStation.LONGITUDE), env.API_KEY, db, env.ONEMAP_EMAIL, env.ONEMAP_PW)
					}
				}
				return new Response()
			}

			const chatId: string = payload.message.chat.id
			const command: string = payload.message.text.split(" ")[0]
			const argsRaw: string = payload.message.text.split(" ").slice(1).join(" ")
			switch (command) {
				case "/new": {
					if (!argsRaw) {
						await sendMessage(chatId, 'Name for list needed', env.API_KEY)
						return new Response();
					}
					const listId = new ListId()
					await db.createNewList(chatId, listId, argsRaw)
					await sendMessage(chatId, 'List created, active set to this list', env.API_KEY)
				} break
				case "/viewlist": {
					let user = await db.getUser(chatId)

					if (user?.list_names.length === 0) {
						await sendMessage(chatId, 'No lists found!', env.API_KEY)
					} else {
						await sendMessage(chatId, user?.list_names.map((v, i) => `(${i + 1}) ${v}`).join("\n") ?? 'No lists found!', env.API_KEY)
					}
				} break
				case "/view": {
					let listInfo = await db.viewList(chatId)
					if (!listInfo || !('listInfo' in listInfo)) {
						await sendMessage(chatId, "Error: List does not exist", env.API_KEY);
					} else {
						let message = listInfo.listInfo.list.length == 0 ? "No lists items found!" : listInfo.listInfo.list.map((v: InputData, i: number) => locationViewParser(i + 1, v)).join("\n\n");
						await sendMessage(chatId, listInfo.listInfo.name + "\n" + message, env.API_KEY);
					}
				} break
				case "/active": {
					if (!argsRaw || isNaN(Number(argsRaw))) {
						await sendMessage(chatId, 'Integer list index needed', env.API_KEY)
						return new Response();
					}
					let new_aid_list = (await db.getUser(chatId))?.list_ids
					if (!new_aid_list) {
						await sendMessage(chatId, 'No lists found', env.API_KEY)
						return new Response();
					}
					if (new_aid_list!.length < Number(argsRaw)) {
						await sendMessage(chatId, 'Invalid list index given', env.API_KEY)
						return new Response();
					}
					let user = await db.setActiveList(chatId, new_aid_list![Number(argsRaw) - 1])
					await sendMessage(chatId, user ? 'Updated active list' : 'Error, list does not exist', env.API_KEY)
				} break
				case "/add": {
					if (!argsRaw) {
						await sendMessage(chatId, 'Item to add needed', env.API_KEY)
						return new Response();
					}
					const p: string = argsRaw.split(" ")[0]
					const n: string = argsRaw.split(" ").slice(1).join(" ")
					if (!p || !n) {
						await sendMessage(chatId, 'Postal code and name needed', env.API_KEY)
						return new Response();
					}
					let data: InputData = generateInputData(p, n)
					const opts = generateInlineKeyboardMarkup(Cuisine, data, UserFields.Cuisine)
					await sendMessage(chatId, cuisineText, env.API_KEY, JSON.stringify(opts));
				} break
				case "/remove": {
					if (!argsRaw || isNaN(Number(argsRaw))) {
						await sendMessage(chatId, 'Index of item to be removed needed', env.API_KEY)
						return new Response();
					}
					let list_id = await db.removeFromList(chatId, String(Number(argsRaw) - 1))
					await sendMessage(chatId, list_id ? 'List updated' : 'Error', env.API_KEY)
				} break
				case "/removelist": {
					if (!argsRaw || isNaN(Number(argsRaw))) {
						await sendMessage(chatId, 'Index of list to be removed needed', env.API_KEY)
						return new Response();
					}
					let user = await db.removeList(chatId, Number(argsRaw) - 1)
					if (!user) {
						await sendMessage(chatId, 'No lists to remove', env.API_KEY)
						return new Response();
					}
					await sendMessage(chatId, 'List removed', env.API_KEY)
				} break
				case "/export": {
					let user = await db.getUser(chatId)
					await sendMessage(chatId, user?.active_id.toJSON() ?? 'No lists found!', env.API_KEY)
				} break
				case "/import": {
					const listId = new ListId(argsRaw)
					let list = await db.importList(chatId, listId)
					if (!list) {
						await sendMessage(chatId, 'Invalid import token!', env.API_KEY)
						return new Response();
					}
					await sendMessage(chatId, 'List successfully imported! Active list set to imported list', env.API_KEY)
				} break
				case "/nearby": {
					let dist = Number(argsRaw)
					if (isNaN(dist)) {
						dist = 0
					}
					await sendMessage(chatId, nearbyText, env.API_KEY, JSON.stringify(generateInlineKeyboardMarkup(NearbyType, {"threshold": dist}, 'key')))
				} break
				case "/direction": {
					if (!argsRaw || isNaN(Number(argsRaw))) {
						await sendMessage(chatId, 'Index of place needed', env.API_KEY)
						return new Response();
					}
					await sendMessage(chatId, directionText, env.API_KEY, JSON.stringify(generateInlineKeyboardMarkup(NearbyType, {"index": argsRaw}, 'key')))
				}
			}

			return new Response();
		} catch (error) {
			console.error(error)
			return new Response();
		}

	}
};