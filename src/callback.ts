import { sendMessage, answerCallback } from './telegramApi.ts';
import { getMapData, MrtData } from './onemapApi.ts'
import { InputData, LocationType, UserFields } from './models.ts';
import { calcDist, generateInlineKeyboardMarkup } from './utils.ts';
import { ListData, UserData } from './mongodb.ts';
import jsonData from './data.json' assert { type: 'json' };


export async function handleCallback(payload, api: string, listCollection:Realm.Services.MongoDB.MongoDBCollection<ListData>, userCollection:Realm.Services.MongoDB.MongoDBCollection<UserData>) {
	const data: InputData = JSON.parse(payload.callback_query.data)
    if (UserFields.LocationType in data) {
        await answerCallback(payload.callback_query.id, "Processing", api)
        const map = await getMapData(data[UserFields.PostalCode])
        const chatId = payload.callback_query.message.chat.id
        if (map.found == 0) {
            await sendMessage(chatId, "Postal code seems to be invalid", api);
            return
        }
        data[UserFields.LocationData] = map.results[0]
        const mrtData: MrtData[] = jsonData
        
        let nearestDist = 99999999
        let nearestMrt = mrtData[0]

        mrtData.forEach(mrt => {
            const d = calcDist(Number(mrt.LATITUDE), Number(mrt.LONGITUDE), Number(map.results[0].LATITUDE), Number(map.results[0].LONGITUDE))
            if (d < nearestDist) {
                nearestDist = d
                nearestMrt = mrt
            }
        })

        nearestMrt.DISTANCE = nearestDist
        data[UserFields.NearestMrt] = nearestMrt

        let list_id = (await userCollection.findOne({
            _id: chatId
        }))?.active_id;

        await listCollection.updateOne({
            _id: list_id,
        }, {
            $push: {
                list: data
            }
        });
        await sendMessage(chatId, list_id ? 'List updated' : 'Error no list found', api)
        return
    }

    const opts = generateInlineKeyboardMarkup(LocationType, data, UserFields.LocationType)
 
    await answerCallback(payload.callback_query.id, "Selected", api)
    await sendMessage(payload.callback_query.message.chat.id, "Please select the location type", api, JSON.stringify(opts));
}