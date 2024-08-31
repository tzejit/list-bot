import { sendMessage, answerCallback, editKeyboard } from './telegramApi.ts';
import { Cuisine, InputData, LocationType, UserFields, YesNo } from './models.ts';
import { generateInlineKeyboardMarkup, generateSelectionInlineKeyboardMarkup, locationViewParser, saveLocationData } from './utils.ts';
import { Database } from './mongodb.ts';
import { cuisineText, directionGetLocText, directionMrtText, directionText, filterCuisineText, filterLocationText, locationText, nearbyGetLocText, nearbyMrtText, nearbyText, noteReply, noteText } from './consts.ts';


export async function handleCallback(payload, api: string, db: Database) {
    const text = payload.callback_query.message.text
    let callback: Function = () => { };
    if (text.includes(cuisineText)) {
        callback = handleAddCuisineCallback
    } else if (text.includes(locationText)) {
        callback = handleAddLocationCallback
    } else if (text.includes(noteText)) {
        callback = handleAddNoteCallback
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
    const opts = generateInlineKeyboardMarkup(YesNo, data, UserFields.Note)
    await answerCallback(payload.callback_query.id, "Selected", api)
    await sendMessage(payload.callback_query.message.chat.id, noteText, api, JSON.stringify(opts));

}
async function handleAddNoteCallback(payload, api: string, db: Database) {
    const data: InputData = JSON.parse(payload.callback_query.data)
    await answerCallback(payload.callback_query.id, "Selected", api)
    const list_data = await saveLocationData(payload, api, db)
    if (data[UserFields.Note] == String(YesNo.Yes)) {
        await sendMessage(payload.callback_query.message.chat.id, noteReply + (list_data!.list.length + 1), api, JSON.stringify({ force_reply: true }));
    } else {
        await sendMessage(payload.callback_query.message.chat.id, list_data ? 'List updated' : 'Error no list found', api)
    }
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