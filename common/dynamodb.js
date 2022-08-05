
const AWS = require('aws-sdk/global');
const DynamoDB = require('aws-sdk/clients/dynamodb');
const ENDPOINT = process.env['AWS_SAM_LOCAL'] ?
    'http://host.docker.internal:8000/' :
    'dynamodb.us-west-2.amazonaws.com';

AWS.config.dynamodb = {
    endpoint: ENDPOINT,
};
exports.DbClient = class DbClient {
    /**
   * init DynamoClient
   * @param {string} table
   */
    constructor(table = process.env.DYNAMO_TABLE) {
        console.log(`table name =>${table}`);
        this.docClient = new DynamoDB.DocumentClient();
        this.table = table;
    }
    /**
   *
   */
    async readAll() {
        const data = await this.docClient.scan({TableName: this.table}).promise();
        return data.Items;
    }

    /**
   * @param {any} id
   */
    async read(id) {
        const params = {
            TableName: this.table,
            Key: {id: id},
        };
        const data = await this.docClient.get(params).promise();
        return data.Item;
    }

    /**
   * @param {object} Item
   */
    async write(Item) {
        const params = {
            TableName: this.table,
            Item,
        };

        return await this.docClient.put(params).promise();
    }
};
