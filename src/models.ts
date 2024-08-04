import { LocationData } from "./onemapApi";

export enum UserFields {
    PostalCode = 'p',
    Name = 'n',
    Cuisine = 'c',
    LocationType = 't',
    LocationData = 'd'
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
    [UserFields.PostalCode]: number;
    [UserFields.Name]: string;
    [UserFields.Cuisine]?: Cuisine;
    [UserFields.LocationType]?: LocationType;
    [UserFields.LocationData]?: LocationData;
}

export function generateInputData(p: string, n: string): InputData {
    return {
        [UserFields.PostalCode]: Number(p),
        [UserFields.Name]: n
    }
}