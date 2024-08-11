import { sendMessage, answerCallback, editKeyboard } from './telegramApi.ts';
import { getMapData, MrtData } from './onemapApi.ts'
import { Cuisine, InputData, LocationType, UserFields } from './models.ts';
import { calcDist, generateInlineKeyboardMarkup, generateSelectionInlineKeyboardMarkup, locationViewParser } from './utils.ts';
import { Database } from './mongodb.ts';
import jsonData from './data.json' assert { type: 'json' };
import { cuisineText, directionGetLocText, directionMrtText, directionText, filterCuisineText, filterLocationText, locationText, nearbyGetLocText, nearbyMrtText, nearbyText } from './consts.ts';


export async function handleCallback(payload, api: string, db: Database) {
    const text = payload.callback_query.message.text
    let callback: Function = () => { };
    if (text.includes(cuisineText)) {
        callback = handleAddCuisineCallback
    } else if (text.includes(locationText)) {
        callback = handleAddLocationCallback
    } else if (text.includes(nearbyText)) {
        callback = handleNearbyCallback
    } else if (text.includes(directionText)) {
        callback = handleDirectionCallback
    } else if (text.includes(filterCuisineText)) {
        callback = handleFilterCuisineCallback
    } else if (text.includes(filterLocationText)) {
        callback = handleFilterLocationCallback
    }
    await callback(payload, api, db)
}

async function handleAddLocationCallback(payload, api: string, db: Database) {
    const data: InputData = JSON.parse(payload.callback_query.data)
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

    let list_id = await db.addToList(chatId, data)
    await sendMessage(chatId, list_id ? 'List updated' : 'Error no list found', api)
    return

}

async function handleAddCuisineCallback(payload, api: string, db: Database) {
    const data: InputData = JSON.parse(payload.callback_query.data)
    const opts = generateInlineKeyboardMarkup(LocationType, data, UserFields.LocationType)
    await answerCallback(payload.callback_query.id, "Selected", api)
    await sendMessage(payload.callback_query.message.chat.id, locationText, api, JSON.stringify(opts));
}

async function handleNearbyCallback(payload, api: string, db: Database) {
    const chatId = payload.callback_query.message.chat.id
    const data = JSON.parse(payload.callback_query.data)
    let msg = data.key == 0 ? nearbyMrtText : nearbyGetLocText
    if (data.threshold > 0) {
        msg += ` within ${data.threshold}m`
    }
    await answerCallback(payload.callback_query.id, "Selected", api)
    await sendMessage(chatId, msg, api, JSON.stringify({ force_reply: true }));
}

async function handleDirectionCallback(payload, api: string, db: Database) {
    const chatId = payload.callback_query.message.chat.id
    const data = JSON.parse(payload.callback_query.data)
    let msg = data.key == 0 ? directionMrtText : directionGetLocText
    msg += data.index
    await answerCallback(payload.callback_query.id, "Selected", api)
    await sendMessage(chatId, msg, api, JSON.stringify({ force_reply: true }));
}

async function handleFilterCuisineCallback(payload, api: string, db: Database) {
    const chatId = payload.callback_query.message.chat.id
    const message_id = payload.callback_query.message.message_id
    const data = JSON.parse(payload.callback_query.data)
    await answerCallback(payload.callback_query.id, "Selected", api)

    if (data.next !== 1) {
        const opts = generateSelectionInlineKeyboardMarkup(Cuisine, data, UserFields.Cuisine)
        await editKeyboard(chatId, message_id, api, JSON.stringify(opts));
    } else {
        data.next = 0
        const opts = generateSelectionInlineKeyboardMarkup(LocationType, { ...data, [UserFields.LocationType]: [] }, UserFields.LocationType)
        await sendMessage(chatId, filterLocationText, api, JSON.stringify(opts));
    }
}

async function handleFilterLocationCallback(payload, api: string, db: Database) {
    const chatId = payload.callback_query.message.chat.id
    const message_id = payload.callback_query.message.message_id
    const data = JSON.parse(payload.callback_query.data)
    await answerCallback(payload.callback_query.id, "Selected", api)

    if (data.next !== 1) {
        const opts = generateSelectionInlineKeyboardMarkup(LocationType, data, UserFields.LocationType)
        await editKeyboard(chatId, message_id, api, JSON.stringify(opts));
    } else {
        let listInfo = await db.viewList(chatId)
        if (!listInfo || !('listInfo' in listInfo)) {
            await sendMessage(chatId, "Error: List does not exist", api);
        } else {
            const dataList = listInfo.listInfo.list.filter(e => {
                let locCheck = true
                let cuisCheck = true
                if (data[UserFields.LocationType].length > 0) {
                    locCheck = data[UserFields.LocationType].includes(e[UserFields.LocationType])
                }
                if (data[UserFields.Cuisine].length > 0) {
                    cuisCheck = data[UserFields.Cuisine].includes(e[UserFields.Cuisine])
                } 
                return locCheck && cuisCheck
            })
            let message = dataList.length == 0 ? "No lists items found!" : dataList.map((v: InputData, i: number) => locationViewParser(i + 1, v)).join("\n\n");
            await sendMessage(chatId, listInfo.listInfo.name + "\n" + message, api);
        }
    }

}