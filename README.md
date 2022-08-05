# AWS Layers Template


- [AWS Layers Template](aws-layers-template)
  - [Technologies](#technologies)
  - [Overview](#overview)
    - [Lambda layers](#lambda-layers)
  - [Local Development](#local-development)
    - [Installation Pre-requisites](#installation-pre-requisites)
    - [Configure Husky](#configure-husky)
    - [Preserving local environment](#preserving-local-environment)
    - [Debugging](#debugging)
        - [Direct Launch](#direct-launch)
        - [Attach to debugger](#attach-to-debugger)
  - [Deployment](#deployment)
    - [Build script](#build-script)
        - [Install](#install)
        - [Pre Build](#pre-build)
        - [Build](#build)

## Technologies
* NodeJS 14.x (the minor version is specified by AWS)
* AWS Lambda
* AWS CloudFormation
* AWS DynamoDB

## Overview
This project contains source code build files for a serverless application written in Node.js using shared layers. It utilizes a number of AWS services, including Lambda functions, an API Gateway and DynamoDB. The `template.yaml` file describes these resources and AWS Cloudformation will update and deploy those resources. The goal was to demonstrate how to structure a project utilizing common shared layers, while also maintaining the ability to debug and step through code locally.

### Lambda layers
Lambda layers are a way to structure lambda projects that encourage code sharing and separation of responsibilities. It is created as a separate .zip that can be accessed by the main Lambda .zip. Lambda layers can only be used by Lambdas deployed as a .zip archive.

To create a layer, define a resource in the `template.yaml` pointing to the folder to use:

    CommonLayer:
        Type: AWS::Serverless::LayerVersion
        Properties:
            LayerName: common-dependencies
            Description: Common dependencies
            ContentUri: common/

Calling resources gain access to the layer by declaring the layer in their own resource definitions

    GetAllItemsFunction:
        Type: AWS::Serverless::Function 
        ...
        Layers:
            - !Ref CommonLayer

AWS will publish the content of layers to the `/opt/` folder. Calling code can then access code within layers by pathing within `/opt/`. For example calling within the `utils` folder of `CommonLayer` becomes:
```javascript
const DbClient = require('/opt/utils/dynamodb').DbClient;
```
## Local Development

### Installation Pre-requisites
* NodeJS 14.x
* AWS CLI - https://aws.amazon.com/cli/
* AWS SAM CLI - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html
* VSCode (optional)
* Docker (optional)

### Installing SAM CLI

In order to run and test your lambda locally, you will need to install the SAM CLI. AWS provides guidance here: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html

### Configuring AWS Credentials

For the CLI to run you'll need to configure it with AWS credentials to run under. See the documentation here: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-getting-started-set-up-credentials.html

The recommendation is to skip to the `Not using the AWS CLI` section and create a credentials file that includes the AWS access key and secret.

### Installing Local DynamoDB

In order to install and set up a local instance of DynamoDB refer to the AWS documentation here: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html

### Setting up the Local dynamoDB

With the dynamodb instance running, run the following command to create the StorageTable table:
```
aws dynamodb create-table \
    --table-name StorageTable \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \        
    --key-schema AttributeName=id,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
    --endpoint-url http://localhost:8000
```

Once the table has been created, you can use the provided `initial_test_data.json` to load the table with some test data in order to run and pass the unit test. To do so run the following command:
```
aws dynamodb batch-write-item --request-items file://initial_test_data.json --endpoint-url http://localhost:8000    
```

### Preserving local environment
While `/opt/` works for published code, the IDE and unit testing have no means to locate or use the `/opt/` path. To preserve code resolution within the IDE and unit testing framework, pathing hints have been added to the project. First by adding a `jsconfig.json` within the root of each handler for IDE resolution:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "paths": {
      "/opt/*": ["../../common/*"]
    }
  }
}
```

And also within the root `package.json` for the unit testing framework (jest)
```
  "jest": {
    "moduleNameMapper": {
      "/opt/(.*)": "<rootDir>/common/$1"
    }
  },
```

### Invoking the Lambda locally
Invoke the lambda function with the following:
```
sam build
sam local invoke "GetTestItemFunction" -t template.yaml --env-vars=env.json
```


### Debugging

The included `launch.json` file in the `.vscode` folder offers two ways to debug. 

#### Direct Launch
The first is directly launching and executing against the API gateway endpoints. Here the environment variables are supplied as part of the config

```json
{
    "configurations": [
        {
            "type": "aws-sam",
            "request": "direct-invoke",
            "name": "API node-lambda-test:GetAllItemsFunction",
            "lambda": {
                "payload": {},
                "environmentVariables": {
                    "DYNAMO_TABLE": "StorageTable"
                }
            },
```

#### Attach to debugger
The second method is to invoke the method locally via AWS SAM CLI in debug mode and attach the debugger. The benefit of this is that the environment variables are loaded from a file specified in the command line.

First invoke the lambda via the AWS SAM CLI terminal and include the `-d` debug option and port number. Also specify the template and environemnt variable file to use.

`>sam local invoke "GetTestItemFunction" -t template.yaml --env-vars=env.json -d 9999`

The port number should match the one defined in the `launch.json` config:

```json
{
    "configurations": [
        {
            "name": "Attach to GetAllItemsFunction",
            "type": "node",
            "request": "attach",
            "address": "localhost",
            "port": 9999,

```

Once the lambda is running the terminal will report the debugger is listening:

`Debugger listening on ws://0.0.0.0:9999/296dce3e-be1c-4a92-b5c9-99d10c7094b8`

From there select Run & Debug from the left menu and select one of the `Attach to ...` profiles.

## Deployment 

Deployment is handled by AWS CodePipeline with AWS CloudFormation. 

### Build script

The build is handled by the `buildspec.yml` file. This build has an `install`, `pre-build` and `build` phase.


#### Install

The install phase will install all npm packages for each working folder. If new handlers or layers are added, be sure to add commands to path to the folder and install packages


    install:
        runtime-versions:
            nodejs: 14 
        commands:      
          # Install all dependencies (including dependencies for running tests)
          - npm install 
          - cd $CODEBUILD_SRC_DIR/common/utils && npm install 
          - cd $CODEBUILD_SRC_DIR/handlers/get_all_items && npm install
          - cd $CODEBUILD_SRC_DIR/handlers/get_test_item && npm install   
      
#### Pre-build

The pre-build phase will then run Test scripts from the root `package.json`. This ensures that unit tests are run as part of the build process. Once complete, the unit test folder is deleted and npm is run again to remove all dependencies not needed for deployment (devDependencies). This reduces the size of the deployed lambda archives.

Again, if new handlers or layers are added, be sure to add commands to path to the folder and run `npm prune --production`

    pre_build:
        commands:
          - cd $CODEBUILD_SRC_DIR/
          # Run all unit tests
          - npm run test
          # Remove tests folder to reduce size
          - rm -rf ./tests
          # Remove all dependencies not needed for deployment (devDependencies)
          - npm prune --production
          - cd $CODEBUILD_SRC_DIR/common/utils && npm prune --production
          - cd $CODEBUILD_SRC_DIR/handlers/get_all_items && npm prune --production
          - cd $CODEBUILD_SRC_DIR/handlers/get_test_item && npm prune --production

#### Build

Finally the build phase uses AWS Cloudformation to transform the `template.yaml` based on the destination S3 bucket and prefix (folder). The outputted `post-template.yaml` is then used to generate the changeset for the AWS Stack.

These variables are populated from the CodeBuild Environment variables.

    build:
        commands:
          - cd $CODEBUILD_SRC_DIR/
          # Use AWS SAM to package the application by using AWS CloudFormation
          - aws cloudformation package --debug --template $INPUT_FILE --s3-bucket $S3_BUCKET --s3-prefix $APP_NAME --output-template post-template.yaml