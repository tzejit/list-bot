export function generateInlineKeyboardMarkup(enumType: any, data: object, jsonKey: string) {
    
    let arr = Object.values(enumType)
    let key = arr.slice(0,Math.ceil(arr.length / 2))
    let value = arr.slice(Math.ceil(arr.length / 2))
    let options: {[s: string] : number} = {}
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
                "callback_data": (JSON.stringify({...data, [jsonKey]:value}))
            }
        )
        counter++
      }
    finalArray.push(keyArray)

    return  { "inline_keyboard":  finalArray}
}

export function calcDist(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180; // φ, λ in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const d = R * c; // in metres
    return d
}