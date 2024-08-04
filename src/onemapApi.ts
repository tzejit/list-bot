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

interface OneMapResponse {
    found: number,
    totalNumPages: number,
    pageNum: number,
    results: LocationData[]
}

export async function getMapData(postcode: number) {
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

async function getToken(params) {
    
}