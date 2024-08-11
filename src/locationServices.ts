import { InputData, UserFields } from "./models";
import { Database } from "./mongodb";
import { getMapDirection } from "./onemapApi";
import { sendLocation, sendMessage } from "./telegramApi";
import { calcDist, directionParser, locationDistanceParser } from "./utils";

export async function getNearby(chatId: string, threshold: number, lat: number, lon: number, api: string, db: Database, mrt?: string) {
    if (!mrt) {
        mrt = "you"
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
        await sendMessage(chatId, `Places near ${mrt}\n${text}`, api, JSON.stringify({ remove_keyboard: true }));
    }
}

export async function getDirection(chatId: string, index: number, lat: number, lon: number, api: string, db: Database, email: string, password: string) {
    let listInfo = await db.viewList(chatId)
    if (!listInfo || !('listInfo' in listInfo) || listInfo.listInfo.list.length < index) {
        await sendMessage(chatId, "Error: List or list index does not exist", api, JSON.stringify({ remove_keyboard: true }));
    } else {
        const data: InputData = listInfo.listInfo.list[index - 1]
        const locationData = data[UserFields.LocationData]!
        const directionData = await getMapDirection(`${lat},${lon}`, `${locationData.LATITUDE},${locationData.LONGITUDE}`, email, password)
        let msg = "<b>Directions</b>"
        directionData.forEach((d, i) => msg += `\n\n<u>Direction ${i+1}</u>\n${directionParser(d, data[UserFields.Name])}`)
        msg += `\n\nAlternatively, click on the map below to open google maps`
        await sendMessage(chatId, msg, api, JSON.stringify({ remove_keyboard: true }))
        await sendLocation(chatId, Number(locationData.LATITUDE), Number(locationData.LONGITUDE), api, JSON.stringify({ remove_keyboard: true }));
    }
}