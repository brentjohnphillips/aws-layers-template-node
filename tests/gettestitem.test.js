
// Grab the lambda handler we want to test
const lambdaHandler = require('../handlers/get_test_item/index').lambdaHandler;
// Import dynamodb from aws-sdk
const DbClient = require('/opt/dynamodb').DbClient;

// Test for GetTestItemFunction handler()
describe('Test GetTestItemFunction Handler', () => {
    let scanSpy;
    // Test one-time setup and teardown, see more in https://jestjs.io/docs/en/setup-teardown
    beforeAll(() => {
        // Mock the db client, hijack the readAll
        scanSpy = jest.spyOn(DbClient.prototype, 'read');
    });

    // Clean up mocks
    afterAll(() => {
        scanSpy.mockRestore();
    });

    it('should return data', async () => {
        // Our Mock data
        const item = {id: 'test'};

        // Set up the return value from readAll
        scanSpy.mockReturnValue(item);

        // Invoke handler()
        const result = await lambdaHandler();

        // The expected response from the handler
        const expectedResult = {
            statusCode: 200,
            body: JSON.stringify({
                message: `Test item => ${JSON.stringify(item)}`,
            })};

        // Make sure the out put matches what we expect
        expect(result).toEqual(expectedResult);
    });
});
