#!/bin/bash
# LocalStack ready hook — provision the demo SQS queue used by MESSAGING_DRIVER=sqs
awslocal sqs create-queue --queue-name user-events
