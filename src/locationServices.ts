import { InputData, UserFields } from "./models";
import { UserData } from "./mongodb";
import { sendMessage } from "./telegramApi";
import { calcDist, locationDistanceParser } from "./utils";

export async function getNearby(payload, api: string, userCollection:Realm.Services.MongoDB.MongoDBCollection<UserData>) {
    const chatId = payload.chat.id
    const lat = Number(payload.location.latitude)
    const lon = Number(payload.location.longitude)
    const reply = payload.reply_to_message.text.split(" ")
    let threshold = 999999999
    if (!isNaN(Number(reply[reply.length - 1].replace("m", '')))) {
        threshold = Number(reply[reply.length - 1].replace("m", ''))
    }
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
        await sendMessage(chatId, "Error: List does not exist", api, JSON.stringify({ remove_keyboard: true }));
    } else {
        const data: InputData[] = listInfo.listInfo.list
        const output: any[] = []
        data.forEach((d, id) => {
            const dist = calcDist(lat, lon, Number(d[UserFields.LocationData]!.LATITUDE), Number(d[UserFields.LocationData]!.LONGITUDE))
            if (dist < threshold) {
                output.push({id, dist, data: d})
            }
        })
        output.sort((a,b) => a.dist - b.dist)
        await sendMessage(chatId, output.map(o => locationDistanceParser(o.id, o.dist, o.data)).join('\n\n'), api, JSON.stringify({ remove_keyboard: true }));
    }
}