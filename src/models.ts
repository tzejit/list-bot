import { LocationData, MrtData } from "./onemapApi";

export enum UserFields {
    PostalCode = 'p',
    Name = 'n',
    Cuisine = 'c',
    LocationType = 't',
    LocationData = 'd',
    NearestMrt = 'm'
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

export interface InputData {
    [UserFields.PostalCode]: string;
    [UserFields.Name]: string;
    [UserFields.Cuisine]?: Cuisine;
    [UserFields.LocationType]?: LocationType;
    [UserFields.LocationData]?: LocationData;
    [UserFields.NearestMrt]?: MrtData;
}

export function generateInputData(p: string, n: string): InputData {
    return {
        [UserFields.PostalCode]: p,
        [UserFields.Name]: n
    }
}