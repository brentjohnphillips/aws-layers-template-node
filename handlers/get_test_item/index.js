const DbClient = require('/opt/dynamodb').DbClient;

let response;

exports.lambdaHandler = async (event, context) => {
    try {
        const client = new DbClient();
        const data = await client.read('test');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message: `Test item => ${JSON.stringify(data)}`,
            }),
        };
    } catch (err) {
        console.log(err);
        return err;
    }

    return response;
};

if (require.main === module) {
    (async () => {
        const result = await exports.lambdaHandler();
        console.log(result);
    })();
}
