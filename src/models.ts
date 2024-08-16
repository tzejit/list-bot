import { LocationData, MrtData } from "./onemapApi";

export enum UserFields {
    PostalCode = 'p',
    Name = 'n',
    Cuisine = 'c',
    LocationType = 't',
    LocationData = 'd',
    NearestMrt = 'm',
    Visited = 'v'
}

export enum Cuisine {
    Chinese,
    Thai,
    Korean,
    Japanese,
    Italian,
    French,
    Western,
    Others
}

export enum LocationType {
    Hawker,
    Cafe,
    Eatery,
    Restaurant,
    Others
}

export enum NearbyType {
    MRT,
    Location
}

export interface InputData {
    [UserFields.PostalCode]: string;
    [UserFields.Name]: string;
    [UserFields.Cuisine]?: Cuisine;
    [UserFields.LocationType]?: LocationType;
    [UserFields.LocationData]?: LocationData;
    [UserFields.NearestMrt]?: MrtData;
    [UserFields.Visited]?: boolean
}

export function generateInputData(p: string, n: string): InputData {
    return {
        [UserFields.PostalCode]: p,
        [UserFields.Name]: n
    }
}