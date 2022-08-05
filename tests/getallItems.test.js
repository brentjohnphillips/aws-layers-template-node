
// Grab the lambda handler we want to test
const lambdaHandler = require('../handlers/get_all_items/index').lambdaHandler;
// Import dynamodb from aws-sdk
const DbClient = require('/opt/dynamodb').DbClient;

// Test for GetAllItemsFunction handler()
describe('Test GetAllItemsFunction', () => {
    let scanSpy;
    // Test one-time setup and teardown, see more in https://jestjs.io/docs/en/setup-teardown
    beforeAll(() => {
        // Mock the db client, hijack the readAll
        scanSpy = jest.spyOn(DbClient.prototype, 'readAll');
    });

    // Clean up mocks
    afterAll(() => {
        scanSpy.mockRestore();
    });

    it('should return data', async () => {
        // Our Mock data
        const items = [{id: 'id1'}, {id: 'id2'}];

        // Set up the return value from readAll
        scanSpy.mockReturnValue(items);

        // Invoke handler()
        const result = await lambdaHandler();

        // The expected response from the handler
        const expectedResult = {
            statusCode: 200,
            body: JSON.stringify({
                message: `All items from DB => ${JSON.stringify(items)}`,
            })};

        // Make sure the out put matches what we expect
        expect(result).toEqual(expectedResult);
    });
});
