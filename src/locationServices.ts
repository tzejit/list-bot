import { InputData, UserFields } from "./models";
import { Database, UserData } from "./mongodb";
import { getMapDirection, getToken } from "./onemapApi";
import { sendLocation, sendMessage } from "./telegramApi";
import { calcDist, capitalize, directionParser, locationDistanceParser } from "./utils";

export async function getNearby(payload, api: string, db: Database) {
    const chatId = payload.chat.id
    const lat = Number(payload.location.latitude)
    const lon = Number(payload.location.longitude)
    const reply = payload.reply_to_message.text.split(" ")
    let threshold = 999999999
    if (!isNaN(Number(reply[reply.length - 1].replace("m", '')))) {
        threshold = Number(reply[reply.length - 1].replace("m", ''))
    }
    let listInfo = await db.viewList(chatId)
    if (!listInfo || !('listInfo' in listInfo)) {
        await sendMessage(chatId, "Error: List does not exist", api, JSON.stringify({ remove_keyboard: true }));
    } else {
        const data: InputData[] = listInfo.listInfo.list
        const output: any[] = []
        data.forEach((d, id) => {
            const dist = calcDist(lat, lon, Number(d[UserFields.LocationData]!.LATITUDE), Number(d[UserFields.LocationData]!.LONGITUDE))
            if (dist < threshold) {
                output.push({ id, dist, data: d })
            }
        })
        output.sort((a, b) => a.dist - b.dist)
        const text = output.length != 0 ? output.map(o => locationDistanceParser(o.id + 1, o.dist, o.data)).join('\n\n') : "No places found!"
        await sendMessage(chatId, text, api, JSON.stringify({ remove_keyboard: true }));
    }
}

export async function getDirection(payload, api: string, db: Database, email: string, password: string) {
    const chatId = payload.chat.id
    const lat = Number(payload.location.latitude)
    const lon = Number(payload.location.longitude)
    const reply = payload.reply_to_message.text.split(" ")
    const index = Number(reply[reply.length - 1])
    let listInfo = await db.viewList(chatId)
    if (!listInfo || !('listInfo' in listInfo) || listInfo.listInfo.list.length < index) {
        await sendMessage(chatId, "Error: List or list index does not exist", api, JSON.stringify({ remove_keyboard: true }));
    } else {
        const data: InputData = listInfo.listInfo.list[index - 1]
        const locationData = data[UserFields.LocationData]!
        const directionData = await getMapDirection(`${lat},${lon}`, `${locationData.LATITUDE},${locationData.LONGITUDE}`, email, password)
        const msg = `<u>Directions</u>\n` + directionParser(directionData, data[UserFields.Name]) + `\n\nAlternatively, click on the map below to open google maps`
        await sendMessage(chatId, msg, api, JSON.stringify({ remove_keyboard: true }))
        await sendLocation(chatId, Number(locationData.LATITUDE), Number(locationData.LONGITUDE), api, JSON.stringify({ remove_keyboard: true }));
    }
}