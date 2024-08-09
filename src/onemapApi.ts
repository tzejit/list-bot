export interface LocationData {
    SEARCHVAL: string,
    BLK_NO: string,
    ROAD_NAME: string,
    BUILDING: string,
    ADDRESS: string,
    POSTAL: string,
    X: string,
    Y: string,
    LATITUDE: string,
    LONGITUDE: string
}

export interface MrtData extends LocationData {
    CODE: string[],
    DISTANCE?: number
}

interface OneMapResponse {
    found: number,
    totalNumPages: number,
    pageNum: number,
    results: LocationData[]
}

export async function getMapData(postcode: string) {
	const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postcode}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const data : OneMapResponse = await response.json();
    if (!response.ok ) {
        console.error('Error getting map data:', data);
    }
    return data
}

export async function getToken(email, password) {
    const url = "https://www.onemap.gov.sg/api/auth/post/getToken"
	const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
            email,
            password
        }),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    const data = await response.json();
    if (!response.ok ) {
        console.error('Error getting token data:', data);
    }
    return data.access_token
}

export async function getMapDirection(start: string, end: string, email: string, password: string) {
    const token = await getToken(email, password)
    const date = new Date().toLocaleDateString('en-us', {month: '2-digit', day: '2-digit', year: 'numeric'}).replace(/\//g, "-")
    const time = new Date().toLocaleTimeString('en-gb')
    const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${start}&end=${end}&routeType=pt&date=${date}&time=${time}&mode=TRANSIT&maxWalkDistance=500&numItineraries=1`
	const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
    });
    const data = await response.json();
    if (!response.ok ) {
        console.error('Error getting map data:', data);
        console.error(url)
    }
    return data.plan.itineraries[0]

}