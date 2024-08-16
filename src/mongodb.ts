import * as Realm from 'realm-web';
import { InputData, UserFields } from './models';

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

export class Database {
    id: string
    data_key: string
    userCollection: globalThis.Realm.Services.MongoDB.MongoDBCollection<UserData>
    listCollection: globalThis.Realm.Services.MongoDB.MongoDBCollection<ListData>

    constructor(id: string, data_key: string) {
        this.id = id
        this.data_key = data_key
    }

    async initConnection() {
        App = App || new Realm.App(this.id);

        const credentials = Realm.Credentials.apiKey(this.data_key);
        // Attempt to authenticate
        var user = await App.logIn(credentials);
        var client = user.mongoClient('mongodb-atlas');

        this.listCollection = client.db('listBot').collection<ListData>('listData');
        this.userCollection = client.db('listBot').collection<UserData>('userData');
    }

    async createNewList(chatId: string, listId: Realm.BSON.UUID, argsRaw: string) {
        await this.userCollection.updateOne({
            _id: chatId,
        }, {
            $push: {
                list_ids: listId,
                list_names: argsRaw
            },
            $set: {
                active_id: listId
            }
        }, {
            upsert: true
        });

        await this.listCollection.insertOne({
            _id: listId,
            name: argsRaw,
            list: [],
            users: [chatId]
        })
    }

    async getUser(chatId: string) {
        return await this.userCollection.findOne({
            _id: chatId,
        });
    }

    async getList(listId: Realm.BSON.UUID) {
        return await this.listCollection.findOne({
            _id: listId,
        });
    }

    async viewList(chatId: string) {
        return (await this.userCollection.aggregate([
            {
                $match: {
                    _id: chatId
                }
            }, {
                $lookup: {
                    from: "listData",
                    localField: "active_id",
                    foreignField: "_id",
                    as: "listInfo"
                }
            }, {
                $project: {
                    "listInfo": { "$arrayElemAt": ["$listInfo", 0] }
                }
            }
        ]))[0];
    }

    async setActiveList(chatId: string, uid: Realm.BSON.UUID) {
        return await this.userCollection.updateOne({
            _id: chatId,
        }, {
            $set: {
                active_id: uid
            }
        });
    }

    async removeFromList(chatId: string, index: string) {
        let list_id = (await this.userCollection.findOne({
            _id: chatId
        }))?.active_id;

        let unset_index = "list." + index
        await this.listCollection.updateOne({
            _id: list_id,
        }, {
            $unset: {
                [unset_index]: 1
            }
        });

        await this.listCollection.updateOne({
            _id: list_id,
        }, {
            $pull: {
                list: null
            }
        });

        return list_id
    }

    async removeList(chatId: string, index: number) {
        let user = await this.getUser(chatId)

        if (!user) {return false}

        let removed_id = user!.list_ids.splice(index, 1)[0]
        user!.list_names.splice(index, 1)

        if (user!.active_id.toJSON() === removed_id.toJSON()) {
            user!.active_id = user!.list_ids[0] ?? ''
        }

        await this.userCollection.findOneAndReplace({
            _id: chatId,
        }, user!)

        await this.listCollection.updateOne({
            _id: removed_id,
        }, {
            $pull: {
                users: user!._id
            }
        });

        await this.listCollection.deleteOne({
            _id: removed_id,
            users: { $eq: [] }
        });

        return true
    }

    async importList(chatId:string, listId: Realm.BSON.UUID) {
        let list = await this.getList(listId)

        if (!list) {
            return false
        }

        await this.userCollection.updateOne({
            _id: chatId,
        }, {
            $push: {
                list_ids: listId,
                list_names: list.name
            },
            $set: {
                active_id: listId
            }
        }, {
            upsert: true
        });

        await this.listCollection.updateOne({
            _id: listId
        }, {
            $push: {
                users: chatId
            }
        })
        return true
    }

    async addToList(chatId: string, data: InputData) {
        let list_id = (await this.userCollection.findOne({
            _id: chatId
        }))?.active_id;

        if (!list_id) {
            return false
        }

        await this.listCollection.updateOne({
            _id: list_id,
        }, {
            $push: {
                list: data
            }
        });

        return true
    }

    async markListItem(chatId: string, index: string) {
        // Can probably be done in 1 function call
        let list_id = (await this.userCollection.findOne({
            _id: chatId
        }))?.active_id;

        let list_index = "list." + index + "." + UserFields.Visited

        const listInfo = await this.viewList(chatId)
        let bool = !listInfo.listInfo.list[index][UserFields.Visited]
        await this.listCollection.updateOne({
            _id: list_id,
        }, {
            $set: {
                [list_index]: bool
            }
        });

        return true
    }

}