import { Cuisine, InputData, LocationType, UserFields, YesNo } from "./models"
import { Database } from "./mongodb"
import { getMapData, MrtData } from "./onemapApi"
import { sendMessage } from "./telegramApi"
import jsonData from './data.json' assert { type: 'json' };


export function generateInlineKeyboardMarkup(enumType: any, data: object, jsonKey: string) {

    let arr = Object.values(enumType)
    let key = arr.slice(0, Math.ceil(arr.length / 2))
    let value = arr.slice(Math.ceil(arr.length / 2))
    let options: { [s: string]: number } = {}
    key.forEach((v, ind) => options[String(v)] = Number(value[ind]))

    let keyArray: object[] = []
    let finalArray: object[] = []
    let counter = 0
    for (const [key, value] of Object.entries(options)) {
        if (counter == 4) {
            finalArray.push(keyArray)
            keyArray = []
        }
        keyArray.push(
            {
                "text": key,
                "callback_data": (JSON.stringify({ ...data, [jsonKey]: value }))
            }
        )
        counter++
    }
    finalArray.push(keyArray)

    return { "inline_keyboard": finalArray }
}

export function generateSelectionInlineKeyboardMarkup(enumType: any, data: object, jsonKey: string) {

    let arr = Object.values(enumType)
    let key = arr.slice(0, Math.ceil(arr.length / 2))
    let value = arr.slice(Math.ceil(arr.length / 2))
    let options: { [s: string]: number } = {}
    key.forEach((v, ind) => options[String(v)] = Number(value[ind]))

    let jsonString = JSON.stringify(data)
    let keyArray: object[] = []
    let finalArray: object[] = []
    let counter = 0
    for (const [key, value] of Object.entries(options)) {
        let cloneObj = JSON.parse(jsonString)
        let textValue = key
        if (data[jsonKey].includes(value)) {
            textValue += " ✅"
            cloneObj[jsonKey] = cloneObj[jsonKey].filter(item => item !== value)
        } else {
            cloneObj[jsonKey].push(value)
        }
        if (counter == 3) {
            finalArray.push(keyArray)
            keyArray = []
            counter = 0
        }
        keyArray.push(
            {
                "text": textValue,
                "callback_data": (JSON.stringify(cloneObj))
            }
        )
        counter++
    }
    finalArray.push(keyArray)
    finalArray.push([{
        "text": "Confirm",
        "callback_data": (JSON.stringify({...data, next:1}))
    }])

    return { "inline_keyboard": finalArray }
}

export function calcDist(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres
    return d
}

export function locationDistanceParser(id: string, dist: number, data: InputData) {
    const cuisineType = Object.values(Cuisine)[Number(data[UserFields.Cuisine]!)]
    const locationType = Object.values(LocationType)[Number(data[UserFields.LocationType]!)]
    let uom = 'm'
    let formattedDist = Math.round(dist)
    if (formattedDist >= 1000) {
        formattedDist = Math.round(formattedDist / 100) / 10
        uom = 'km'
    }
    return `<u>${data[UserFields.Name]}</u> (${formattedDist}${uom})\nID: ${id}\nCuisine: ${cuisineType}\nType: ${locationType}`
}

export function capitalize(str: string) {
    str = str.toLowerCase()
    return str[0].toUpperCase() + str.substring(1)
}

export function camelCase(str: string) {
    return str.split(" ").map(e => capitalize(e)).join(" ")
}

export function locationViewParser(id: number, data: InputData) {
    const cuisineType = Object.values(Cuisine)[Number(data[UserFields.Cuisine]!)]
    const locationType = Object.values(LocationType)[Number(data[UserFields.LocationType]!)]
    const mrtData = data[UserFields.NearestMrt]!
    let mrtName = mrtData.SEARCHVAL.split("MRT STATION")[0].trim().split(" ").map(e => capitalize(e)).join(" ")
    let mrtCode = mrtData.CODE.join('/')
    let msg = `<u>${id}. ${data[UserFields.Name]}</u>\nCuisine: ${cuisineType}\nType: ${locationType}\n${Math.round(mrtData.DISTANCE!)}m from ${mrtName} (${mrtCode})`
    if (data[UserFields.Visited]) {
        msg = `<s>${msg}</s>`
    }
    return msg
}

export function directionParser(paylod, destination: string) {
    const legs = paylod.legs
    let directionList: any = []
    legs.forEach(l => {
        directionList.push({
            mode: capitalize(l.mode),
            name: camelCase(l.to.name),
            code: l.to.stopCode,
            distance: Math.round(l.distance),
            route: l.route,
            stops: l.intermediateStops ? l.intermediateStops.length + 1 : 0,
            duration: Math.round(l.duration / 60)
        })
    })
    directionList[directionList.length - 1].name = destination
    return directionList.map(e => directionLegParser(e)).join('\n')
}

function directionLegParser(payload) {
    let code = payload.code ? ` (${payload.code}) ` : " "
    let text = ""
    if (payload.mode == "Walk") {
        text += `${payload.mode} ${payload.distance}m`
    } else if (payload.mode == "Bus") {
        text += `Take ${payload.stops} stops with bus ${payload.route}`
    } else {
        text += `Take ${payload.stops} stops`
    }

    return text + ` to ${payload.name}${code}(${payload.duration} min)`
}

export async function saveLoactionData(payload, api: string, db: Database) {
    const data: InputData = JSON.parse(payload.callback_query.data)
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

    if (data[UserFields.Note] == String(YesNo.No)) {
        delete data[UserFields.Note]
    }

    let list_data = await db.addToList(chatId, data)
    return list_data

}