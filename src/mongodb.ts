import * as Realm from 'realm-web';
import { InputData } from './models';

type Document = globalThis.Realm.Services.MongoDB.Document;

export interface ListData extends Document {
	_id: Realm.BSON.UUID;
	name: string;
	list: InputData[];
	users: string[];
}

export interface UserData extends Document {
	_id: string;
	list_ids: Realm.BSON.UUID[];
	list_names: string[];
	active_id: Realm.BSON.UUID;
}

let App: Realm.App;

export const ListId = Realm.BSON.UUID;

export async function initConnection(mongo_id: string, data_key :string): Promise<[globalThis.Realm.Services.MongoDB.MongoDBCollection<ListData>, globalThis.Realm.Services.MongoDB.MongoDBCollection<UserData>]> {
    App = App || new Realm.App(mongo_id);

    const credentials = Realm.Credentials.apiKey(data_key);
    // Attempt to authenticate
    var user = await App.logIn(credentials);
    var client = user.mongoClient('mongodb-atlas');

    const listCollection = client.db('listBot').collection<ListData>('listData');
    const userCollection = client.db('listBot').collection<UserData>('userData');
    return [listCollection, userCollection]
}

