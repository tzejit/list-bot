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