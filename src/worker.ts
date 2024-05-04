import * as Realm from 'realm-web';

type Document = globalThis.Realm.Services.MongoDB.Document;

interface ListData extends Document {
	_id: Realm.BSON.UUID;
	name: string;
	list: string[];
	users: string[];
}

interface UserData extends Document {
	_id: string;
	list_ids: Realm.BSON.UUID[];
	list_names: string[];
	active_id: Realm.BSON.UUID;
}

let App: Realm.App;
const ListId = Realm.BSON.UUID;

async function sendMessage(chat_id: string, message: string, api_key: string) {
	const url = `https://api.telegram.org/bot${api_key}/sendMessage?chat_id=${chat_id}&text=${encodeURIComponent(message)}`
	await fetch(url).then(resp => resp.json());
}

export default {
	async fetch(request, env) {

		if (request.method !== "POST") {
			return new Response();
		}

		const payload = await request.json()

		if (!('entities' in payload.message)) {
			return new Response()
		}

		App = App || new Realm.App(env.MONGO_ID);

		try {
			const credentials = Realm.Credentials.apiKey(env.DATA_KEY);
			// Attempt to authenticate
			var user = await App.logIn(credentials);
			var client = user.mongoClient('mongodb-atlas');
		} catch (err) {
			return new Response('Error in connecting to DB')
		}

		const listCollection = client.db('listBot').collection<ListData>('listData');
		const userCollection = client.db('listBot').collection<UserData>('userData');

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
				await userCollection.updateOne({
					_id: chatId,
				}, {
					$push: {
						list_ids: listId,
						list_names: argsRaw
					},
					$set: {
						active_id: listId
					}
				}, {
					upsert: true
				});

				await listCollection.insertOne({
					_id: listId,
					name: argsRaw,
					list: [],
					users: [chatId]
				})

				await sendMessage(chatId, 'List created, active set to this list', env.API_KEY)
			} break
			case "/viewlist": {
				let user = await userCollection.findOne({
					_id: chatId,
				});
				
				if (user?.list_names.length === 0) {
					await sendMessage(chatId, 'No lists found!', env.API_KEY)
				} else {
					await sendMessage(chatId, user?.list_names.map((v, i) => `(${i + 1}) ${v}`).join("\n") ?? 'No lists found!', env.API_KEY)
				}

			} break
			case "/view": {
				let listInfo = (await userCollection.aggregate([
					{
						$match: {
							_id: chatId
						}
					}, {  
						$lookup: {
							from: "listData",
							localField: "active_id",
							foreignField: "_id",
							as: "listInfo"
						}
					}, {
						$project: {
							"listInfo": { "$arrayElemAt": ["$listInfo", 0] }
						}
					}
				]))[0];
				if (!listInfo || !('listInfo' in listInfo)) {
					await sendMessage(chatId, "Error: List does not exist", env.API_KEY);
				} else {
					let message = listInfo.listInfo.list.length == 0 ? "No lists items found!" : listInfo.listInfo.list.map((v, i) => `(${i + 1}) ${v}`).join("\n");
					await sendMessage(chatId, listInfo.listInfo.name + "\n" + message, env.API_KEY);
				}
			} break
			case "/active": {
				if (!argsRaw || isNaN(Number(argsRaw))) {
					await sendMessage(chatId, 'Integer list index needed', env.API_KEY)
					return new Response();
				}

				let new_aid_list = (await userCollection.findOne({
					_id: chatId,
				}))?.list_ids

				if (!new_aid_list) {
					await sendMessage(chatId, 'No lists found', env.API_KEY)
					return new Response();
				}

				if (new_aid_list!.length < Number(argsRaw)) {
					await sendMessage(chatId, 'Invalid list index given', env.API_KEY)
					return new Response();
				}

				let user = await userCollection.updateOne({
					_id: chatId,
				}, {
					$set: {
						active_id: new_aid_list![Number(argsRaw) - 1]
					}
				});
				await sendMessage(chatId, user ? 'Updated active list' : 'Error, list does not exist', env.API_KEY)
			} break
			case "/add": {

				if (!argsRaw) {
					await sendMessage(chatId, 'Item to add needed', env.API_KEY)
					return new Response();
				}

				let list_id = (await userCollection.findOne({
					_id: chatId
				}))?.active_id;

				await listCollection.updateOne({
					_id: list_id,
				}, {
					$push: {
						list: argsRaw
					}
				});
				await sendMessage(chatId, list_id ? 'List updated' : 'Error no list found', env.API_KEY)
			} break
			case "/remove": {

				if (!argsRaw || isNaN(Number(argsRaw))) {
					await sendMessage(chatId, 'Index of item to be removed needed', env.API_KEY)
					return new Response();
				}

				let list_id = (await userCollection.findOne({
					_id: chatId
				}))?.active_id;

				let unset_index = "list." + String(Number(argsRaw) - 1)
				await listCollection.updateOne({
					_id: list_id,
				}, {
					$unset: {
						[unset_index]: 1
					}
				});

				await listCollection.updateOne({
					_id: list_id,
				}, {
					$pull: {
						list: null
					}
				});

				await sendMessage(chatId, list_id ? 'List updated' : 'Error', env.API_KEY)
			} break
			case "/removelist": {

				if (!argsRaw || isNaN(Number(argsRaw))) {
					await sendMessage(chatId, 'Index of list to be removed needed', env.API_KEY)
					return new Response();
				}

				let user = await userCollection.findOne({
					_id: chatId,
				});

				if (!user) {
					await sendMessage(chatId, 'No lists to remove', env.API_KEY)
					return new Response();
				}

				let index = Number(argsRaw) - 1

				let removed_id = user!.list_ids.splice(index, 1)[0]
				user!.list_names.splice(index, 1)

				if (user!.active_id.toJSON() === removed_id.toJSON()) {
					user!.active_id = user!.list_ids[0]??''
				}

				await userCollection.findOneAndReplace({
					_id: chatId,
				}, user!)

				await listCollection.updateOne({
					_id: removed_id,
				}, {
					$pull: {
						users: user!._id
					}
				});

				await listCollection.deleteOne({
					_id: removed_id,
					users: { $eq: [] }
				});

				await sendMessage(chatId, 'List removed', env.API_KEY)
			} break
			case "/export": {
				let user = await userCollection.findOne({
					_id: chatId,
				});

				await sendMessage(chatId, user?.active_id.toJSON() ?? 'No lists found!', env.API_KEY)
			} break
			case "/import": {
				const listId = new ListId(argsRaw)

				let list = await listCollection.findOne({
					_id: listId
				})

				if (!list) {
					await sendMessage(chatId, 'Invalid import token!', env.API_KEY)
					return new Response(); 
				}

				await userCollection.updateOne({
					_id: chatId,
				}, {
					$push: {
						list_ids: listId,
						list_names: list.name
					},
					$set: {
						active_id: listId
					}
				}, {
					upsert: true
				});

				await listCollection.updateOne({
					_id: listId
				}, {
					$push: {
						users: chatId
					}
				})

				await sendMessage(chatId, 'List successfully imported! Active list set to imported list', env.API_KEY)
			} break
		}

		return new Response();
	},
};