export async function sendMessage(chat_id: string, message: string, api_key: string, reply_markup="") {
	const url = `https://api.telegram.org/bot${api_key}/sendMessage`
    const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
            chat_id: chat_id,
            text: message,
            reply_markup: reply_markup,
            parse_mode: "HTML"
        }),
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const data = await response.json();
    if (!data.ok) {
        console.error('Error sending message:', data.description);
    }
}

export async function answerCallback(query_id: string, message: string, api_key: string) {
	const url = `https://api.telegram.org/bot${api_key}/answerCallbackQuery`
	const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
            callback_query_id: query_id,
            text: message,
        }),
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const data = await response.json();
    if (!data.ok) {
        console.error('Error answering callback query:', data.description);
    }
}

export async function sendLocation(chat_id: string, latitude: number, longitude: number, api_key: string, reply_markup="") {
	const url = `https://api.telegram.org/bot${api_key}/sendLocation`
    const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
            chat_id,
            latitude,
            longitude,
            reply_markup: reply_markup,
            parse_mode: "HTML"
        }),
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const data = await response.json();
    if (!data.ok) {
        console.error('Error sending location:', data.description);
    }
}