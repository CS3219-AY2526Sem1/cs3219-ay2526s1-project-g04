# Message broker module

This package contains the source code for sending/listening message to/from a message broker

### How to use

1. Ensure rabbitMQ service is running. [Guide to run](../../infrastructure/broker/README.md
)

2. Have .env file with the `RABBITMQ_URL` value

### For services that wants to publish message to the broker

Sample code:
```js
const messager = new MessagePublisher("publisher_name") // pass in a name to keep track who publishes

await messager.connect()

// sends `random message` with type CollaborationService
await messager.publishMessageWithType(MESSAGE_TYPES.CollaborationService, "random message")
```

### For services that wants to listen message from the broker

Sample code:
```js
const messager = new MessageReceiver("receiver_name") // pass in a name to keep track who listens

await messager.connect()

// Message handler, handle the respective messages
const message_handler = (msgType: MESSAGE_TYPES, msg: string)=>{
  if (msgType === MESSAGE_TYPES.CollaborationService)
    console.log(msg)
}

// Only listens to message with CollaborationService type
messager.listenForMessagesWithType([MESSAGE_TYPES.CollaborationService], message_handler)
```
